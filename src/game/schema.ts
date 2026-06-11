import { z } from "zod";

// Companion types that route through the code-gen game path instead of the
// declarative Simulation Lab path. The Designer maps these to template ids.
export const GAME_COMPANION_TYPES = [
  "Arcade Game (experimental)",
  "Flashcard Quest (experimental)",
  "Trail Master (experimental)",
  "Lab Exhibit (experimental)",
] as const;

export function isGameCompanionType(companionType: string): boolean {
  return (GAME_COMPANION_TYPES as readonly string[]).includes(companionType);
}

// All registered template ids. The Designer chooses one; the Builder
// receives the matching template contract.
export const TEMPLATE_IDS = [
  "phaser3-arcade",
  "flashcard-quest",
  "trail-master",
  "lab-exhibit",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

// ---- Stage 1: Game Designer ----
export const GameDesignSchema = z.object({
  templateId: z
    .enum(TEMPLATE_IDS)
    .describe(
      "Which template to build into. 'phaser3-arcade' for projectile/dodge/collect; 'flashcard-quest' for recall under stakes with a deck of cards; 'trail-master' for a branching journey with consequential decisions at each waypoint; 'lab-exhibit' for slider-driven interactive exhibits that look like the actual topic (soccer goal, lever, ecosystem, water cycle, rocket launch). Pick based on the brief.",
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
    .describe(
      "REQUIRED when templateId is 'flashcard-quest' or 'trail-master'.",
    ),
  exhibit: z
    .object({
      sceneDescription: z
        .string()
        .describe(
          "Concrete visual brief for the Builder: WHAT the student sees on screen at rest. e.g. 'A soccer player figure (emoji 🦵) left-of-center facing right, a soccer goal (white rectangle with net hatching) on the right edge, a green field below, a sky-blue background. The ball (white circle with pentagon) sits at the player's foot.' Specify colors, positions, primitives. NO image assets.",
        ),
      animationDescription: z
        .string()
        .describe(
          "Concrete visual brief: what ANIMATES when the student presses Run. e.g. 'The ball launches from the player's foot, follows a curved arc whose shape depends on kickAngle and curves sideways with spinRate using Math.sin. If the ball passes the goal's mouth, the net wobbles and the score increments. A trail of small dots fades behind the ball.' Be specific about which variables drive which motion.",
        ),
      variables: z
        .array(
          z.object({
            id: z
              .string()
              .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "must be a JS identifier"),
            label: z.string(),
            min: z.number(),
            default: z.number(),
            max: z.number(),
            unit: z.string(),
            studentExplanation: z
              .string()
              .describe("Kid-friendly one-line description of the slider."),
          }),
        )
        .min(2)
        .max(5)
        .describe(
          "The sliders the student manipulates. Same shape as Simulation Lab variables. min < default < max. The Builder reads these from GAME_CONFIG.exhibit.variables.",
        ),
      outcomes: z
        .array(
          z.object({
            id: z
              .string()
              .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "must be a JS identifier"),
            label: z.string(),
            unit: z.string(),
            formula: z
              .string()
              .describe(
                "JS expression in the variable ids + Math.* only. Must evaluate finite across all (min, default, max) combinations. Used both for the readout and to drive the animation.",
              ),
            isPrimary: z.boolean(),
          }),
        )
        .min(1)
        .max(3)
        .describe(
          "Computed outcomes the exhibit displays as a readout. Exactly one isPrimary=true.",
        ),
    })
    .optional()
    .describe(
      "REQUIRED when templateId is 'lab-exhibit'. The interactive exhibit: a topic-specific Phaser scene, sliders that change real numbers, computed outcomes, and an animation that visualizes the formula at play.",
    ),
  trail: z
    .object({
      destination: z
        .string()
        .describe(
          "Name of where the journey ends, e.g. 'the Summit', 'Magna Carta', 'the Reef'. Used in title and end screen.",
        ),
      opening: z
        .string()
        .describe(
          "1-2 sentence setup shown on the title card. Hooks the student into the journey.",
        ),
      steps: z
        .array(
          z.object({
            prompt: z
              .string()
              .describe(
                "The scene + question at this waypoint, e.g. 'You reach a river fork. The current flows faster on the right.'",
              ),
            choices: z
              .array(
                z.object({
                  text: z.string().describe("Short choice label, ≤8 words."),
                  isCorrect: z.boolean(),
                  consequence: z
                    .string()
                    .describe(
                      "Sympathetic feedback shown after the choice. On correct: celebrate why. On wrong: gentle explanation of the misconception.",
                    ),
                }),
              )
              .min(2)
              .max(3)
              .describe(
                "Exactly one choice MUST have isCorrect=true. Distractors must be plausible misconceptions, not absurd jokes.",
              ),
          }),
        )
        .min(5)
        .max(12)
        .describe("The ordered sequence of decision waypoints."),
    })
    .optional()
    .describe(
      "REQUIRED when templateId is 'trail-master'. The branching journey: 5-12 waypoints, each with 2-3 choices where exactly one is correct. The code reads this from GAME_CONFIG.trail.",
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
