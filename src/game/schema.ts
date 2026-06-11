import { z } from "zod";

// Companion types that route through the code-gen game path instead of the
// declarative Simulation Lab path. The Designer maps these to template ids.
export const GAME_COMPANION_TYPES = [
  "Arcade Game (experimental)",
  "Flashcard Quest (experimental)",
] as const;

export function isGameCompanionType(companionType: string): boolean {
  return (GAME_COMPANION_TYPES as readonly string[]).includes(companionType);
}

// All registered template ids. The Designer chooses one; the Builder
// receives the matching template contract.
export const TEMPLATE_IDS = ["phaser3-arcade", "flashcard-quest"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

// ---- Stage 1: Game Designer ----
export const GameDesignSchema = z.object({
  templateId: z
    .enum(TEMPLATE_IDS)
    .describe(
      "Which template to build into. 'phaser3-arcade' for projectile/dodge/collect; 'flashcard-quest' for recall under stakes with a deck of cards. Pick based on the brief.",
    ),
  title: z.string(),
  genre: z
    .string()
    .describe(
      "Short genre tag, e.g. 'collector', 'dodge-em', 'flashcard quest', 'sorting catcher'.",
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
    .min(2)
    .max(10)
    .describe(
      "Numeric tunables the code must read from GAME_CONFIG, e.g. playerSpeed, spawnIntervalMs, pointsToWin.",
    ),
  flashcardDeck: z
    .array(
      z.object({
        prompt: z.string(),
        correct: z.string(),
        distractors: z.array(z.string()).min(2).max(3),
        explanation: z
          .string()
          .optional()
          .describe(
            "Optional short factoid shown on wrong answer — sympathetic teaching moment.",
          ),
      }),
    )
    .optional()
    .describe(
      "REQUIRED when templateId is 'flashcard-quest'. 10-20 cards specific to the lesson topic. The code reads this from GAME_CONFIG.deck.",
    ),
  theme: z
    .object({
      name: z.string().describe("e.g. 'castle', 'jungle', 'space', 'reef'."),
      background: z
        .string()
        .describe("Hex color for the backdrop, e.g. #1a1a2e."),
      accent: z.string().describe("Hex color for highlights/streak."),
      mascotEmoji: z
        .string()
        .describe(
          "Emoji used as the player or companion mascot, e.g. 🦊, 🐢, 🚀.",
        ),
    })
    .optional()
    .describe("REQUIRED when templateId is 'flashcard-quest'."),
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
