import {
  SceneSchema,
  VariableSchema,
  VisualizationKindSchema,
} from "@/components/blueprint-schema";
import { z } from "zod";

// ---- Stage 1: Planner ----
export const PlanSchema = z.object({
  moduleTitle: z.string(),
  template: z.string(),
  gradeBand: z.string(),
  subject: z.string(),
  durationMinutes: z.number(),
  visualizationKind: VisualizationKindSchema,
  learningObjectives: z.array(z.string()).min(2).max(5),
  standards: z.array(z.string()),
  scenes: z.array(SceneSchema).min(1).max(4),
  variableSeeds: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "id must be a JS identifier"),
        label: z.string(),
        rangeHint: z
          .string()
          .describe(
            "Rough idea of useful min/max/default and unit, in plain English. Example: 'percent, 0 to 100, default 60'. The Mechanic Designer turns this into concrete numbers.",
          ),
      }),
    )
    .min(2)
    .max(6),
  outcomeSeeds: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "id must be a JS identifier"),
        label: z.string(),
        unit: z.string(),
        isPrimary: z.boolean().optional(),
        intent: z
          .string()
          .describe(
            "One sentence describing what this outcome should measure and how it should depend on the variables. The Mechanic Designer turns this into a formula.",
          ),
      }),
    )
    .min(2)
    .max(4),
});
export type Plan = z.infer<typeof PlanSchema>;

// ---- Stage 2: Mechanic ----
export const MechanicOutcomeSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  formula: z.string(),
  isPrimary: z.boolean().optional(),
});

export const MechanicSchema = z.object({
  variables: z.array(VariableSchema).min(2).max(6),
  outcomes: z.array(MechanicOutcomeSchema).min(2).max(4),
  risks: z.array(z.string()),
});
export type Mechanic = z.infer<typeof MechanicSchema>;

// ---- Stage 3: Content ----
export const ContentSchema = z.object({
  studentIntro: z.string(),
  teacherPrep: z.array(z.string()).min(2).max(5),
  materials: z.array(z.string()),
  assessments: z.array(z.string()).min(3).max(6),
  tips: z.array(z.string()).min(3).max(6),
  vocabulary: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .min(2)
    .max(6),
  sourceAttribution: z.array(z.string()),
});
export type Content = z.infer<typeof ContentSchema>;

// ---- Stage 4: Review ----
export const CritiqueSchema = z.object({
  stage: z.enum(["planner", "mechanic", "writer"]),
  severity: z.enum(["nit", "issue", "blocker"]),
  problem: z.string(),
  suggestion: z.string(),
});

export const ReviewSchema = z.object({
  verdict: z.enum(["approve", "revise", "reject"]),
  scores: z.object({
    pedagogy: z.number().min(0).max(10),
    mechanic: z.number().min(0).max(10),
    copy: z.number().min(0).max(10),
    classroomFit: z.number().min(0).max(10),
  }),
  critiques: z.array(CritiqueSchema),
  summary: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

// ---- Engine telemetry ----
export type StageName = "planner" | "mechanic" | "writer" | "reviewer";

export type StageRun = {
  name: StageName;
  model: string;
  latencyMs: number;
  attempt: number;
  ok: boolean;
  error?: string;
};

export type EngineMeta = {
  totalLatencyMs: number;
  stages: StageRun[];
  revisionCount: number;
  review: Review | null;
  residualIssues: { path: string; problem: string }[];
  keyFingerprint: string;
};

export type EngineBrief = {
  topic: string;
  gradeBand: string;
  subject: string;
  learningObjective: string;
  sourceMaterial?: string;
  companionType: string;
  durationMinutes: number;
  classroomConstraints?: string;
  standards?: string;
  tone?: string;
  accessibility?: string[];
  similarModules?: string;
};
