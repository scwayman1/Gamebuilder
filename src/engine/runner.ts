import {
  type Blueprint,
  BlueprintSchema,
  validateBlueprint,
} from "@/components/blueprint-schema";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  MECHANIC_SYSTEM,
  PLANNER_SYSTEM,
  REVIEWER_SYSTEM,
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

const MODEL = "gpt-4o-mini";
const MAX_REVISIONS = 1;

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
    throw err;
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
      const prompt =
        mechanicUserPrompt(brief, plan) +
        (prior ? revisionInstruction("mechanic", prior) : "");
      const { object } = await generateObject({
        model: openai(MODEL),
        schema: MechanicSchema,
        system: MECHANIC_SYSTEM,
        prompt,
        temperature: attempt === 1 ? 0.4 : 0.2,
        maxRetries: 1,
      });
      return object;
    },
    stages,
  );
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
      const { object } = await generateObject({
        model: openai(MODEL),
        schema: ReviewSchema,
        system: REVIEWER_SYSTEM,
        prompt: reviewerUserPrompt(brief, plan, mechanic, content),
        temperature: 0.2,
        maxRetries: 1,
      });
      return object;
    },
    stages,
  );
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

  try {
    // Sequential pipeline: each stage depends on the previous one. We could
    // later parallelize sub-tasks within the Writer (intro / assessments / tips
    // in parallel), but at this granularity sequential is cheaper and more
    // observable.
    let plan = await runPlanner(openai, brief, null, stages, 1);
    let mechanic = await runMechanic(openai, brief, plan, null, stages, 1);
    let content = await runWriter(
      openai,
      brief,
      plan,
      mechanic,
      null,
      stages,
      1,
    );

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
    const blueprint = parsed.data;
    const residualIssues = validateBlueprint(blueprint);

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
    const error = err instanceof Error ? err.message : "Engine failed";
    return {
      ok: false,
      error,
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
