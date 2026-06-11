import { z } from "zod";

// Companion types that route through the code-gen game path instead of the
// declarative Simulation Lab path.
export const GAME_COMPANION_TYPES = ["Arcade Game (experimental)"] as const;

export function isGameCompanionType(companionType: string): boolean {
  return (GAME_COMPANION_TYPES as readonly string[]).includes(companionType);
}

// ---- Stage 1: Game Designer ----
export const GameDesignSchema = z.object({
  title: z.string(),
  genre: z
    .string()
    .describe(
      "Short genre tag, e.g. 'collector', 'dodge-em', 'target practice', 'sorting catcher'.",
    ),
  concept: z
    .string()
    .describe(
      "2-3 sentences: the core loop and how playing it teaches the learning objective.",
    ),
  learningTieIn: z
    .string()
    .describe(
      "One sentence naming exactly which game action maps to which concept from the brief.",
    ),
  controls: z
    .string()
    .describe(
      "How the student plays, e.g. 'Arrow keys to move, space to jump. On tablets, tap left/right half of screen.'",
    ),
  visualStyle: z
    .string()
    .describe(
      "Colors and shapes only — there are no image assets. e.g. 'Night sky background #1a1a2e, player is a cyan triangle, falling facts are amber circles.'",
    ),
  difficultyRamp: z
    .string()
    .describe("How challenge increases over a 2-3 minute session."),
  winCondition: z.string(),
  configSpec: z
    .array(
      z.object({
        key: z
          .string()
          .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "must be a JS identifier"),
        value: z.number(),
        meaning: z.string(),
      }),
    )
    .min(3)
    .max(10)
    .describe(
      "Numeric tunables the code must read from GAME_CONFIG, e.g. playerSpeed, spawnIntervalMs, pointsToWin.",
    ),
});
export type GameDesign = z.infer<typeof GameDesignSchema>;

// ---- Stage 2: Builder ----
export const GameCodeSchema = z.object({
  configCode: z
    .string()
    .describe(
      "JS defining `const GAME_CONFIG = {...}` with exactly the keys from the design's configSpec. No other statements.",
    ),
  gameCode: z
    .string()
    .describe(
      "JS defining `function createGame()` that returns a `new Phaser.Game(...)`. Uses the global `Phaser` (v3) and reads tunables from GAME_CONFIG. No imports, no network, no external assets.",
    ),
});
export type GameCode = z.infer<typeof GameCodeSchema>;

// ---- Assembled artifact ----
export type GameArtifact = {
  templateId: string;
  title: string;
  design: GameDesign;
  // Raw blocks retained so the repair loop can operate on source, not
  // on assembled HTML.
  code: GameCode;
  html: string;
  createdAt: number;
  repairCount?: number;
};

// Messages posted from the iframe harness to the parent.
export type HarnessMessage =
  | { type: "ready" }
  | { type: "error"; message: string; stack?: string | null }
  | { type: "console.error"; message: string }
  | { type: "score"; score: number }
  | { type: "heartbeat"; t: number }
  | { type: "capture"; id: string; dataUrl: string | null };

// ---- Stage 3: Visual judge (OpenGame-Bench dimensions + pedagogy) ----
export const JudgeReportSchema = z.object({
  scores: z.object({
    buildHealth: z
      .number()
      .min(0)
      .max(10)
      .describe(
        "Does the game render and run? Blank/black frames, error text, or frozen identical frames score low.",
      ),
    visualUsability: z
      .number()
      .min(0)
      .max(10)
      .describe(
        "Can a child parse the screen? Readable text, visible player/objects, clear score display, sensible contrast.",
      ),
    briefFidelity: z
      .number()
      .min(0)
      .max(10)
      .describe(
        "Does what's on screen match the requested game design (genre, mechanic, visual style)?",
      ),
    learningAlignment: z
      .number()
      .min(0)
      .max(10)
      .describe(
        "Is the learning objective visible IN the mechanic shown (labels, categories, quantities), not just theming?",
      ),
  }),
  verdict: z.enum(["approve", "revise", "reject"]),
  issues: z
    .array(
      z.object({
        severity: z.enum(["nit", "issue", "blocker"]),
        problem: z.string(),
        suggestion: z
          .string()
          .describe(
            "A concrete, code-actionable fix the repair stage can apply.",
          ),
      }),
    )
    .max(8),
  summary: z.string().describe("One sentence for a human reviewer."),
});
export type JudgeReport = z.infer<typeof JudgeReportSchema>;
