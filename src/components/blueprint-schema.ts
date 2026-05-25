import { z } from "zod";

const idRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const VariableSchema = z.object({
  id: z.string().regex(idRegex, "Variable id must be a valid JS identifier"),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  default: z.number(),
  unit: z.string().optional(),
  studentExplanation: z.string(),
});

export const OutcomeSchema = z.object({
  id: z.string().regex(idRegex, "Outcome id must be a valid JS identifier"),
  label: z.string(),
  unit: z.string(),
  formula: z
    .string()
    .describe(
      "JS expression referencing variable IDs. Safe operators only: + - * / Math.abs Math.sin Math.cos Math.min Math.max Math.pow Math.sqrt. Example: 'throwPower * 0.5 + Math.sin(angle * Math.PI / 180) * 6 - drag * 4'.",
    ),
  isPrimary: z
    .boolean()
    .describe(
      "Exactly one outcome in the blueprint must be true — the one shown as the trajectory peak/distance in the visualization. All others must be false.",
    ),
});

export const SceneSchema = z.object({
  id: z.string(),
  label: z.string(),
  goal: z.string(),
});

export const VocabSchema = z.object({
  term: z.string(),
  definition: z.string(),
});

export const VisualizationKindSchema = z
  .enum(["projectile", "bars"])
  .describe(
    "How the primary outcome should be visualized. 'projectile' is a horizontal arc (good for distance/range topics with units like m, ft, km, yd). 'bars' is a horizontal bar chart (good for percentage/score topics with units like %, points, accuracy).",
  );

export type VisualizationKind = z.infer<typeof VisualizationKindSchema>;

export const BlueprintSchema = z.object({
  moduleTitle: z.string(),
  template: z.string(),
  gradeBand: z.string(),
  subject: z.string(),
  durationMinutes: z.number(),
  visualizationKind: VisualizationKindSchema.optional(),
  learningObjectives: z.array(z.string()).min(2).max(5),
  standards: z.array(z.string()),
  studentIntro: z.string(),
  teacherPrep: z.array(z.string()).min(2).max(5),
  materials: z.array(z.string()),
  scenes: z.array(SceneSchema).min(1).max(4),
  variables: z
    .array(VariableSchema)
    .min(2)
    .max(6)
    .describe(
      "Student-tunable inputs that change the simulation outcome. Use camelCase ids like throwPower, releaseAngle.",
    ),
  outcomes: z
    .array(OutcomeSchema)
    .min(2)
    .max(4)
    .describe("Computed metrics shown to the student."),
  tips: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe("Short 'Did You Know?' notes rotated during the simulation."),
  assessments: z.array(z.string()).min(3).max(6),
  vocabulary: z.array(VocabSchema).min(2).max(6),
  risks: z
    .array(z.string())
    .describe("Risks the planner identified for the content team."),
  sourceAttribution: z.array(z.string()),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintVariable = z.infer<typeof VariableSchema>;
export type BlueprintOutcome = z.infer<typeof OutcomeSchema>;

const DISTANCE_UNITS = /^(m|cm|km|ft|yd|mi|in|au|nm|mm)$/i;

export function inferVisualizationKind(
  blueprint: Pick<Blueprint, "outcomes" | "visualizationKind">,
): VisualizationKind {
  if (blueprint.visualizationKind) return blueprint.visualizationKind;
  const primary = blueprint.outcomes.find((o) => o.isPrimary);
  if (primary && DISTANCE_UNITS.test(primary.unit.trim())) return "projectile";
  if (primary?.unit === "%") return "bars";
  // Default to projectile when no signal — it's the most expressive visual.
  return "projectile";
}

const ALLOWED_FORMULA_TOKENS = /^[\s\d\w+\-*/().,]+$/;

export function isFormulaSafe(formula: string): boolean {
  return ALLOWED_FORMULA_TOKENS.test(formula);
}

export function evalFormula(
  formula: string,
  vars: Record<string, number>,
): number {
  if (!isFormulaSafe(formula)) return Number.NaN;
  try {
    const ids = Object.keys(vars);
    const fn = new Function(
      ...ids,
      "Math",
      `"use strict"; return (${formula});`,
    );
    const out = fn(...ids.map((k) => vars[k]), Math);
    return typeof out === "number" && Number.isFinite(out) ? out : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

export type BlueprintIssue = { path: string; problem: string };

export function validateBlueprint(bp: Blueprint): BlueprintIssue[] {
  const issues: BlueprintIssue[] = [];

  const primaryCount = bp.outcomes.filter((o) => o.isPrimary === true).length;
  if (primaryCount !== 1) {
    issues.push({
      path: "outcomes",
      problem: `Exactly one outcome must be marked primary. Found ${primaryCount}.`,
    });
  }

  for (const v of bp.variables) {
    if (v.min >= v.max) {
      issues.push({
        path: `variables.${v.id}`,
        problem: `min (${v.min}) must be < max (${v.max}).`,
      });
    }
    if (v.default < v.min || v.default > v.max) {
      issues.push({
        path: `variables.${v.id}`,
        problem: `default (${v.default}) must be within [${v.min}, ${v.max}].`,
      });
    }
  }

  const points = bp.variables.map((v) => [v.min, v.default, v.max]);
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
  const samples = combos.map((c) => {
    const s: Record<string, number> = {};
    bp.variables.forEach((v, i) => {
      s[v.id] = c[i] ?? v.default;
    });
    return s;
  });
  for (const o of bp.outcomes) {
    let finite = 0;
    let lastBad: Record<string, number> | null = null;
    for (const s of samples) {
      if (Number.isFinite(evalFormula(o.formula, s))) finite++;
      else lastBad = s;
    }
    if (finite === 0) {
      issues.push({
        path: `outcomes.${o.id}.formula`,
        problem: "Formula never produces a finite number.",
      });
    } else if (finite < samples.length) {
      issues.push({
        path: `outcomes.${o.id}.formula`,
        problem: `Formula produces NaN/Infinity at ${samples.length - finite}/${samples.length} sample points${lastBad ? ` (e.g. ${JSON.stringify(lastBad)})` : ""}.`,
      });
    }
  }

  return issues;
}
