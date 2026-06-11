import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import {
  type Blueprint,
  type BlueprintIssue,
  BlueprintSchema,
  evalFormula,
  isFormulaSafe,
  validateBlueprint,
} from "../components/blueprint-schema";
import {
  MECHANIC_SYSTEM,
  PLANNER_SYSTEM,
  REVIEWER_SYSTEM,
  type SampleEvaluation,
  WRITER_SYSTEM,
  mechanicUserPrompt,
  plannerUserPrompt,
  reviewerUserPrompt,
  revisionInstruction,
  writerUserPrompt,
} from "./prompts";
import {
  type Content,
  ContentSchema,
  type EngineBrief,
  type EngineMeta,
  type Mechanic,
  MechanicSchema,
  type Plan,
  PlanSchema,
  type Review,
  ReviewSchema,
  type StageRun,
} from "./types";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL ?? "gpt-4o";
const MAX_REVISIONS = 1;

class StageError extends Error {
  constructor(
    public stage: StageRun["name"],
    public cause: unknown,
  ) {
    super(
      `Stage "${stage}" failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "StageError";
  }
}

export type EngineResult =
  | { ok: true; blueprint: Blueprint; meta: EngineMeta }
  | { ok: false; error: string; meta: EngineMeta };

type Provider = ReturnType<typeof createOpenAI>;

async function runStage<T>(
  name: StageRun["name"],
  attempt: number,
  fn: () => Promise<T>,
  stages: StageRun[],
): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    stages.push({
      name,
      model: MODEL,
      latencyMs: Date.now() - t0,
      attempt,
      ok: true,
    });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    stages.push({
      name,
      model: MODEL,
      latencyMs: Date.now() - t0,
      attempt,
      ok: false,
      error,
    });
    throw new StageError(name, err);
  }
}

function runPlanner(
  openai: Provider,
  brief: EngineBrief,
  prior: Review | null,
  stages: StageRun[],
  attempt: number,
): Promise<Plan> {
  return runStage(
    "planner",
    attempt,
    async () => {
      const prompt =
        plannerUserPrompt(brief) +
        (prior ? revisionInstruction("planner", prior) : "");
      const { object } = await generateObject({
        model: openai(MODEL),
        schema: PlanSchema,
        system: PLANNER_SYSTEM,
        prompt,
        temperature: attempt === 1 ? 0.5 : 0.2,
        maxRetries: 1,
      });
      return object;
    },
    stages,
  );
}

function runMechanic(
  openai: Provider,
  brief: EngineBrief,
  plan: Plan,
  prior: Review | null,
  stages: StageRun[],
  attempt: number,
): Promise<Mechanic> {
  return runStage(
    "mechanic",
    attempt,
    async () => {
      const baseUserPrompt =
        mechanicUserPrompt(brief, plan) +
        (prior ? revisionInstruction("mechanic", prior) : "");

      // Up to two model calls: first attempt, then one feedback-driven repair
      // if the validator catches problems (id drift, dup ids, NaN formula, …).
      let lastObject: Mechanic | null = null;
      let lastProblems: string[] = [];
      for (let i = 0; i < 2; i++) {
        const prompt =
          i === 0
            ? baseUserPrompt
            : `${baseUserPrompt}\n\n---\nYour previous output had ${lastProblems.length} problem(s). Fix EACH one in this revision; do not change anything else:\n${lastProblems
                .map((p, n) => `${n + 1}. ${p}`)
                .join("\n")}`;
        const { object } = await generateObject({
          model: openai(MODEL),
          schema: MechanicSchema,
          system: MECHANIC_SYSTEM,
          prompt,
          temperature: i === 0 && attempt === 1 ? 0.4 : 0.2,
          maxRetries: 1,
        });
        const problems = validateMechanic(object, plan);
        if (problems.length === 0) return object;
        lastObject = object;
        lastProblems = problems;
      }
      throw new Error(
        `Mechanic produced ${lastProblems.length} problem(s) after self-repair: ${lastProblems.join("; ")}. Last output had ${lastObject?.variables.length ?? 0} variables, ${lastObject?.outcomes.length ?? 0} outcomes.`,
      );
    },
    stages,
  );
}

function validateMechanic(mechanic: Mechanic, plan: Plan): string[] {
  const problems: string[] = [];
  const varIds = mechanic.variables.map((v) => v.id);
  const outcomeIds = mechanic.outcomes.map((o) => o.id);

  // 1. Duplicate ids
  const dupVar = duplicates(varIds);
  if (dupVar.length > 0) {
    problems.push(
      `Duplicate variable id(s): [${dupVar.join(", ")}]. Each variable must have a unique id.`,
    );
  }
  const dupOutcome = duplicates(outcomeIds);
  if (dupOutcome.length > 0) {
    problems.push(
      `Duplicate outcome id(s): [${dupOutcome.join(", ")}]. Each outcome must have a unique id.`,
    );
  }

  // 2. Id drift from the Planner's seeds. The Mechanic was instructed to
  // use exactly the seed ids. Drift is a common LLM failure.
  const seedVarIds = new Set(plan.variableSeeds.map((v) => v.id));
  const seedOutcomeIds = new Set(plan.outcomeSeeds.map((o) => o.id));
  const driftedVars = varIds.filter((id) => !seedVarIds.has(id));
  if (driftedVars.length > 0) {
    problems.push(
      `Variable id(s) not in the Planner's variableSeeds: [${driftedVars.join(", ")}]. Use exactly these ids: [${[...seedVarIds].join(", ")}].`,
    );
  }
  const driftedOutcomes = outcomeIds.filter((id) => !seedOutcomeIds.has(id));
  if (driftedOutcomes.length > 0) {
    problems.push(
      `Outcome id(s) not in the Planner's outcomeSeeds: [${driftedOutcomes.join(", ")}]. Use exactly these ids: [${[...seedOutcomeIds].join(", ")}].`,
    );
  }

  // 3. Exactly one primary outcome.
  const primaryCount = mechanic.outcomes.filter((o) => o.isPrimary).length;
  if (primaryCount !== 1) {
    problems.push(
      `Exactly one outcome must have isPrimary:true. Found ${primaryCount}.`,
    );
  }

  // 4. Variable range sanity.
  for (const v of mechanic.variables) {
    if (!(v.min < v.max)) {
      problems.push(
        `Variable ${v.id}: min (${v.min}) must be < max (${v.max}).`,
      );
    }
    if (v.default < v.min || v.default > v.max) {
      problems.push(
        `Variable ${v.id}: default (${v.default}) must be in [${v.min}, ${v.max}].`,
      );
    }
  }

  // 5. Formula sanity (per-outcome).
  problems.push(...validateMechanicFormulas(mechanic));

  return problems;
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    else seen.add(id);
  }
  return [...dup];
}

function validateMechanicFormulas(mechanic: Mechanic): string[] {
  const ids = new Set(mechanic.variables.map((v) => v.id));
  const problems: string[] = [];
  const defaults: Record<string, number> = {};
  for (const v of mechanic.variables) defaults[v.id] = v.default;
  for (const o of mechanic.outcomes) {
    if (!isFormulaSafe(o.formula)) {
      problems.push(
        `${o.id}: formula contains disallowed tokens (only var ids, numbers, Math.*, + - * / parens allowed): "${o.formula}"`,
      );
      continue;
    }
    // Find every bareword identifier the formula references and verify it
    // exists in the variables list (or is "Math").
    const idents = new Set(o.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []);
    const unknown = [...idents].filter((i) => i !== "Math" && !ids.has(i));
    if (unknown.length > 0) {
      problems.push(
        `${o.id}: references unknown identifier(s) [${unknown.join(", ")}]. Variables available: [${[...ids].join(", ")}]. Formula was: "${o.formula}"`,
      );
      continue;
    }
    // Sample-grid sanity check.
    const samples: Array<Record<string, number>> = [];
    const points = mechanic.variables.map((v) => [v.min, v.default, v.max]);
    let combos: number[][] = [[]];
    for (const dim of points) {
      const next: number[][] = [];
      for (const c of combos) for (const p of dim) next.push([...c, p]);
      combos = next;
      if (combos.length > 27) {
        combos = combos.slice(0, 27);
        break;
      }
    }
    for (const c of combos) {
      const s: Record<string, number> = {};
      mechanic.variables.forEach((v, i) => {
        s[v.id] = c[i] ?? v.default;
      });
      samples.push(s);
    }
    const finite = samples.filter((s) =>
      Number.isFinite(evalFormula(o.formula, s)),
    ).length;
    if (finite === 0) {
      problems.push(
        `${o.id}: formula never produces a finite number across the variable sample grid. Formula was: "${o.formula}"`,
      );
    } else if (!Number.isFinite(evalFormula(o.formula, defaults))) {
      // The visualization renders at defaults first — NaN here is what the
      // student sees. As strict as the downstream UI checks.
      problems.push(
        `${o.id}: formula is not finite at the default values ${JSON.stringify(defaults)}. Guard divisions (divide by Math.max(1, x)) and logs (Math.log(1 + x)). Formula was: "${o.formula}"`,
      );
    } else if (finite < samples.length) {
      problems.push(
        `${o.id}: formula produces NaN/Infinity at ${samples.length - finite}/${samples.length} sample points of the (min, default, max) grid. Add guards so it is finite everywhere. Formula was: "${o.formula}"`,
      );
    }
  }
  return problems;
}

// ---- Formula repair (verified-fix, runs on the assembled blueprint) ----
//
// Both the multi-stage path and the single-shot fallback can ship formulas
// that NaN at runtime. This pass detects them deterministically, asks one
// focused model call for fixes, applies ONLY fixes that verify finite
// across the whole sample grid, and — as a last resort — substitutes a
// deterministic placeholder so the student never sees NaN.

function sampleGrid(
  variables: Blueprint["variables"],
): Array<Record<string, number>> {
  const points = variables.map((v) => [v.min, v.default, v.max]);
  let combos: number[][] = [[]];
  for (const dim of points) {
    const next: number[][] = [];
    for (const c of combos) for (const p of dim) next.push([...c, p]);
    combos = next;
    if (combos.length > 27) {
      combos = combos.slice(0, 27);
      break;
    }
  }
  return combos.map((c) => {
    const s: Record<string, number> = {};
    variables.forEach((v, i) => {
      s[v.id] = c[i] ?? v.default;
    });
    return s;
  });
}

export function formulaHealth(
  formula: string,
  variables: Blueprint["variables"],
): { finiteEverywhere: boolean; finiteAtDefaults: boolean } {
  const defaults: Record<string, number> = {};
  for (const v of variables) defaults[v.id] = v.default;
  const grid = sampleGrid(variables);
  const finite = grid.filter((s) =>
    Number.isFinite(evalFormula(formula, s)),
  ).length;
  return {
    finiteEverywhere: finite === grid.length,
    finiteAtDefaults: Number.isFinite(evalFormula(formula, defaults)),
  };
}

// Guaranteed-finite stand-in: normalized average of the variables scaled to
// 0-100, so every slider still visibly moves the outcome.
export function placeholderFormula(variables: Blueprint["variables"]): string {
  const usable = variables.filter((v) => v.max > v.min);
  if (usable.length === 0) return "0";
  const terms = usable.map(
    (v) => `((${v.id} - (${v.min})) / ${v.max - v.min})`,
  );
  return `Math.round(100 * (${terms.join(" + ")}) / ${usable.length})`;
}

const FormulaFixSchema = z.object({
  fixes: z.array(
    z.object({
      outcomeId: z.string(),
      formula: z
        .string()
        .describe(
          "Corrected JS expression using only the variable ids, numbers, Math.*, + - * / and parentheses.",
        ),
    }),
  ),
});

const FORMULA_FIX_SYSTEM = `You repair broken outcome formulas for an educational simulation. Each formula is a single JS expression over the listed variables.

RULES:
- Only variable ids, numeric literals, Math.* functions, + - * / and parentheses. No other identifiers.
- The formula MUST evaluate to a finite number at EVERY combination of each variable's (min, default, max).
- Guard divisions where a variable can be 0: divide by Math.max(1, x) or (x + 1).
- Guard logs/sqrt where a value can be <= 0: Math.log(1 + Math.max(0, x)), Math.sqrt(Math.max(0, x)).
- Preserve the teaching intent: the same variables should still drive the outcome in the same direction; keep magnitudes sensible for the stated unit.
- Return one fix per broken outcome, nothing else.`;

async function repairFormulas(
  openai: Provider,
  blueprint: Blueprint,
  stages: StageRun[],
): Promise<{ blueprint: Blueprint; extraIssues: BlueprintIssue[] }> {
  const broken = blueprint.outcomes.filter(
    (o) => !formulaHealth(o.formula, blueprint.variables).finiteEverywhere,
  );
  if (broken.length === 0) return { blueprint, extraIssues: [] };

  const t0 = Date.now();
  const fixed = new Map<string, string>();
  try {
    const { object } = await generateObject({
      model: openai(FALLBACK_MODEL),
      schema: FormulaFixSchema,
      system: FORMULA_FIX_SYSTEM,
      prompt: `Variables:
${blueprint.variables
  .map(
    (v) =>
      `- ${v.id} ("${v.label}"): min ${v.min}, default ${v.default}, max ${v.max}`,
  )
  .join("\n")}

Broken outcomes:
${broken
  .map(
    (o) =>
      `- ${o.id} ("${o.label}", unit "${o.unit}"): current formula "${o.formula}" is not finite across the sample grid.`,
  )
  .join("\n")}

Fix each formula.`,
      temperature: 0.1,
      maxRetries: 1,
    });
    // Verified-fix protocol: only accept a fix that provably evaluates
    // finite everywhere. A "fix" that fails verification is discarded.
    const varIds = new Set(blueprint.variables.map((v) => v.id));
    for (const fix of object.fixes) {
      if (!broken.some((o) => o.id === fix.outcomeId)) continue;
      if (!isFormulaSafe(fix.formula)) continue;
      const idents = fix.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
      if (idents.some((i) => i !== "Math" && !varIds.has(i))) continue;
      if (!formulaHealth(fix.formula, blueprint.variables).finiteEverywhere)
        continue;
      fixed.set(fix.outcomeId, fix.formula);
    }
    stages.push({
      name: "formula-repair",
      model: FALLBACK_MODEL,
      latencyMs: Date.now() - t0,
      attempt: 1,
      ok: fixed.size === broken.length,
      error:
        fixed.size === broken.length
          ? undefined
          : `Verified ${fixed.size}/${broken.length} fix(es); rest fall back to placeholder.`,
    });
  } catch (err) {
    stages.push({
      name: "formula-repair",
      model: FALLBACK_MODEL,
      latencyMs: Date.now() - t0,
      attempt: 1,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const extraIssues: BlueprintIssue[] = [];
  const outcomes = blueprint.outcomes.map((o) => {
    const repaired = fixed.get(o.id);
    if (repaired) return { ...o, formula: repaired };
    if (!broken.some((b) => b.id === o.id)) return o;
    // Last resort: if it would NaN at defaults (what the student sees
    // first), swap in the deterministic placeholder and flag it loudly
    // for human review. Partial corner-case NaN keeps the original
    // formula — validateBlueprint will still surface it.
    if (!formulaHealth(o.formula, blueprint.variables).finiteAtDefaults) {
      extraIssues.push({
        path: `outcomes.${o.id}.formula`,
        problem: `Auto-substituted a placeholder formula (normalized 0-100 index of all variables) because the generated formula "${o.formula}" was not finite at default values. Needs human review.`,
      });
      return { ...o, formula: placeholderFormula(blueprint.variables) };
    }
    return o;
  });

  return { blueprint: { ...blueprint, outcomes }, extraIssues };
}

function runWriter(
  openai: Provider,
  brief: EngineBrief,
  plan: Plan,
  mechanic: Mechanic,
  prior: Review | null,
  stages: StageRun[],
  attempt: number,
): Promise<Content> {
  return runStage(
    "writer",
    attempt,
    async () => {
      const prompt =
        writerUserPrompt(brief, plan, mechanic) +
        (prior ? revisionInstruction("writer", prior) : "");
      const { object } = await generateObject({
        model: openai(MODEL),
        schema: ContentSchema,
        system: WRITER_SYSTEM,
        prompt,
        temperature: attempt === 1 ? 0.6 : 0.3,
        maxRetries: 1,
      });
      return object;
    },
    stages,
  );
}

function runReviewer(
  openai: Provider,
  brief: EngineBrief,
  plan: Plan,
  mechanic: Mechanic,
  content: Content,
  stages: StageRun[],
  attempt: number,
): Promise<Review> {
  return runStage(
    "reviewer",
    attempt,
    async () => {
      const samples = buildSampleEvaluations(mechanic);
      const { object } = await generateObject({
        model: openai(MODEL),
        schema: ReviewSchema,
        system: REVIEWER_SYSTEM,
        prompt: reviewerUserPrompt(brief, plan, mechanic, content, samples),
        temperature: 0.2,
        maxRetries: 1,
      });
      return object;
    },
    stages,
  );
}

function buildSampleEvaluations(mechanic: Mechanic): SampleEvaluation[] {
  const samples: SampleEvaluation[] = [];

  const defaults: Record<string, number> = {};
  for (const v of mechanic.variables) defaults[v.id] = v.default;
  samples.push({
    label: "defaults",
    variables: { ...defaults },
    outcomes: evalAll(mechanic, defaults),
  });

  const allMin: Record<string, number> = {};
  const allMax: Record<string, number> = {};
  for (const v of mechanic.variables) {
    allMin[v.id] = v.min;
    allMax[v.id] = v.max;
  }
  samples.push({
    label: "all-min",
    variables: { ...allMin },
    outcomes: evalAll(mechanic, allMin),
  });
  samples.push({
    label: "all-max",
    variables: { ...allMax },
    outcomes: evalAll(mechanic, allMax),
  });

  // Per-variable swept-to-max sample to show the influence of each variable.
  for (const v of mechanic.variables) {
    const swept: Record<string, number> = { ...defaults, [v.id]: v.max };
    samples.push({
      label: `${v.id} at max (others default)`,
      variables: swept,
      outcomes: evalAll(mechanic, swept),
    });
  }

  return samples;
}

function evalAll(
  mechanic: Mechanic,
  vars: Record<string, number>,
): Record<string, number | "NaN"> {
  const out: Record<string, number | "NaN"> = {};
  for (const o of mechanic.outcomes) {
    const v = evalFormula(o.formula, vars);
    out[o.id] = Number.isFinite(v) ? Number(v.toFixed(3)) : "NaN";
  }
  return out;
}

function assemble(plan: Plan, mechanic: Mechanic, content: Content): Blueprint {
  // Map mechanic outcomes back to the schema (formula is mandatory there too)
  return {
    moduleTitle: plan.moduleTitle,
    template: plan.template,
    gradeBand: plan.gradeBand,
    subject: plan.subject,
    durationMinutes: plan.durationMinutes,
    visualizationKind: plan.visualizationKind,
    learningObjectives: plan.learningObjectives,
    standards: plan.standards,
    studentIntro: content.studentIntro,
    teacherPrep: content.teacherPrep,
    materials: content.materials,
    scenes: plan.scenes,
    variables: mechanic.variables,
    outcomes: mechanic.outcomes.map((o) => ({
      id: o.id,
      label: o.label,
      unit: o.unit,
      formula: o.formula,
      isPrimary: o.isPrimary,
    })),
    tips: content.tips,
    assessments: content.assessments,
    vocabulary: content.vocabulary,
    risks: mechanic.risks,
    sourceAttribution: content.sourceAttribution,
  };
}

export function maskKey(key: string): string {
  if (key.length < 12) return "key:<too-short>";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export async function runEngine(
  brief: EngineBrief,
  apiKey: string,
): Promise<EngineResult> {
  const t0 = Date.now();
  const stages: StageRun[] = [];
  const keyFingerprint = maskKey(apiKey);
  const openai = createOpenAI({ apiKey });
  const partial: { plan?: Plan; mechanic?: Mechanic; content?: Content } = {};

  try {
    // Sequential pipeline: each stage depends on the previous one. We could
    // later parallelize sub-tasks within the Writer (intro / assessments / tips
    // in parallel), but at this granularity sequential is cheaper and more
    // observable.
    let plan = await runPlanner(openai, brief, null, stages, 1);
    partial.plan = plan;
    let mechanic = await runMechanic(openai, brief, plan, null, stages, 1);
    partial.mechanic = mechanic;
    let content = await runWriter(
      openai,
      brief,
      plan,
      mechanic,
      null,
      stages,
      1,
    );
    partial.content = content;

    // Stage 4: Reviewer
    let review = await runReviewer(
      openai,
      brief,
      plan,
      mechanic,
      content,
      stages,
      1,
    );
    let revisionCount = 0;

    while (
      review.verdict === "revise" &&
      revisionCount < MAX_REVISIONS &&
      review.critiques.some((c) => c.severity !== "nit")
    ) {
      revisionCount++;
      const needs = new Set(review.critiques.map((c) => c.stage));
      if (needs.has("planner")) {
        plan = await runPlanner(
          openai,
          brief,
          review,
          stages,
          revisionCount + 1,
        );
      }
      if (needs.has("mechanic")) {
        mechanic = await runMechanic(
          openai,
          brief,
          plan,
          review,
          stages,
          revisionCount + 1,
        );
      }
      if (needs.has("writer")) {
        content = await runWriter(
          openai,
          brief,
          plan,
          mechanic,
          review,
          stages,
          revisionCount + 1,
        );
      }
      review = await runReviewer(
        openai,
        brief,
        plan,
        mechanic,
        content,
        stages,
        revisionCount + 1,
      );
    }

    // Assemble + validate
    const draft = assemble(plan, mechanic, content);
    const parsed = BlueprintSchema.safeParse(draft);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Assembled blueprint failed schema: ${parsed.error.message}`,
        meta: {
          totalLatencyMs: Date.now() - t0,
          stages,
          revisionCount,
          review,
          residualIssues: [],
          keyFingerprint,
        },
      };
    }
    const { blueprint, extraIssues } = await repairFormulas(
      openai,
      parsed.data,
      stages,
    );
    const residualIssues = [...validateBlueprint(blueprint), ...extraIssues];

    return {
      ok: true,
      blueprint,
      meta: {
        totalLatencyMs: Date.now() - t0,
        stages,
        revisionCount,
        review,
        residualIssues,
        keyFingerprint,
      },
    };
  } catch (err) {
    const stageName =
      err instanceof StageError ? err.stage : ("(unknown)" as const);
    const stageMessage = err instanceof Error ? err.message : "Engine failed";
    console.warn(
      `[engine] multi-stage path failed at "${stageName}": ${stageMessage}. Falling back to single-shot.`,
    );

    // Fallback: ask one model in one call to produce the whole blueprint,
    // seeded with any partial intermediate state we already have. The model
    // upgrades to gpt-4o by default for the rescue path.
    try {
      const fallbackStart = Date.now();
      const { object } = await generateObject({
        model: openai(FALLBACK_MODEL),
        schema: BlueprintSchema,
        system: SINGLE_SHOT_SYSTEM,
        prompt: SINGLE_SHOT_USER(brief, partial),
        temperature: 0.4,
        maxRetries: 1,
      });
      stages.push({
        name: "fallback-single-shot",
        model: FALLBACK_MODEL,
        latencyMs: Date.now() - fallbackStart,
        attempt: 1,
        ok: true,
      });
      // The rescue path is the most likely to ship broken formulas (it's
      // here because the Mechanic already failed) — gate it the same way.
      const { blueprint, extraIssues } = await repairFormulas(
        openai,
        object,
        stages,
      );
      const residualIssues = [...validateBlueprint(blueprint), ...extraIssues];
      return {
        ok: true,
        blueprint,
        meta: {
          totalLatencyMs: Date.now() - t0,
          stages,
          revisionCount: 0,
          review: null,
          residualIssues,
          keyFingerprint,
        },
      };
    } catch (fallbackErr) {
      const fallbackMessage =
        fallbackErr instanceof Error ? fallbackErr.message : "Fallback failed";
      stages.push({
        name: "fallback-single-shot",
        model: FALLBACK_MODEL,
        latencyMs: 0,
        attempt: 1,
        ok: false,
        error: fallbackMessage,
      });
      return {
        ok: false,
        error: `Stage "${stageName}": ${stageMessage}. Fallback also failed: ${fallbackMessage}`,
        meta: {
          totalLatencyMs: Date.now() - t0,
          stages,
          revisionCount: 0,
          review: null,
          residualIssues: [],
          keyFingerprint,
        },
      };
    }
  }
}

const SINGLE_SHOT_SYSTEM = `You are a rescue path for the AB Studios learning module engine. The multi-stage pipeline failed; produce the entire blueprint in one structured response.

Constraints:
- Tailor to the topic in the brief. No defaulting to paper airplanes.
- 2–5 learning objectives.
- 3–5 variables; camelCase ids; min < default < max; include a kid-friendly studentExplanation per variable.
- 2–4 outcomes; for each: id (camelCase), label, unit, formula (JS expression using only the variable ids + Math.* + arithmetic), and isPrimary (boolean, exactly one true across the array).
- Outcomes' formulas must evaluate to a finite number at every (min, default, max) combination of variables. Use Math.max(0, …) to guard.
- Pick visualizationKind: 'projectile' for distance/range topics, 'bars' otherwise.
- 1–4 scenes, 3–6 tips, 3–6 assessments, 2–6 vocabulary terms, 2–5 teacherPrep instructions.
- No preamble, no markdown — only the structured object.`;

function SINGLE_SHOT_USER(
  brief: EngineBrief,
  partial: { plan?: Plan; mechanic?: Mechanic; content?: Content },
): string {
  const briefBlock = [
    `Topic: ${brief.topic}`,
    `Grade band: ${brief.gradeBand}`,
    `Subject: ${brief.subject}`,
    `Learning objective: ${brief.learningObjective}`,
    `Companion type: ${brief.companionType}`,
    `Time available: ${brief.durationMinutes} minutes`,
    brief.tone ? `Tone: ${brief.tone}` : "",
    brief.standards ? `Required standards: ${brief.standards}` : "",
    brief.classroomConstraints
      ? `Classroom constraints: ${brief.classroomConstraints}`
      : "",
    brief.sourceMaterial ? `Source material:\n${brief.sourceMaterial}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Splice in whatever partial state survived the multi-stage attempt. This
  // anchors the fallback so it doesn't drift away from work the Planner /
  // Mechanic / Writer already did.
  const partialBlocks: string[] = [];
  if (partial.plan) {
    partialBlocks.push(
      `Planner output to PRESERVE (use these exact ids, visualizationKind, scenes, learningObjectives, standards):\n${JSON.stringify(
        {
          moduleTitle: partial.plan.moduleTitle,
          template: partial.plan.template,
          visualizationKind: partial.plan.visualizationKind,
          learningObjectives: partial.plan.learningObjectives,
          standards: partial.plan.standards,
          scenes: partial.plan.scenes,
          variableSeeds: partial.plan.variableSeeds,
          outcomeSeeds: partial.plan.outcomeSeeds,
        },
        null,
        2,
      )}`,
    );
  }
  if (partial.mechanic) {
    partialBlocks.push(
      `Mechanic output to PRESERVE (use these exact variable ids + ranges and outcome ids + units; only revise broken formulas):\n${JSON.stringify(
        partial.mechanic,
        null,
        2,
      )}`,
    );
  }
  if (partial.content) {
    partialBlocks.push(
      `Content writer output to PRESERVE (keep this copy verbatim where possible):\n${JSON.stringify(
        partial.content,
        null,
        2,
      )}`,
    );
  }

  const partialSection =
    partialBlocks.length > 0
      ? `\n\n---\n${partialBlocks.join("\n\n---\n")}\n\n---`
      : "";

  return `Lesson brief:\n\n${briefBlock}${partialSection}\n\nProduce the complete blueprint, anchored on whatever partial output is shown above. Fix only what's broken.`;
}
