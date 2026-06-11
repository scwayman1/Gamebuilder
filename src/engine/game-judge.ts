// Visual judge — the OpenGame-Bench evaluation, adapted: instead of a
// separate headless-browser harness, the game already ran in the user's
// sandboxed iframe; we receive ghost-playtest screenshots plus runtime
// telemetry and score them with a vision model.

import {
  type GameDesign,
  type JudgeReport,
  JudgeReportSchema,
} from "@/game/schema";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";

const JUDGE_MODEL = process.env.OPENAI_JUDGE_MODEL ?? "gpt-4o-mini";

const JUDGE_SYSTEM = `You are the QA Judge for the AB Studios game engine. You receive screenshots captured during an automated ghost playtest of a generated educational mini-game, plus its design spec and runtime telemetry. Score it honestly — your job is to catch broken or off-spec games before a teacher sees them.

Scoring guidance:
- buildHealth: blank/black frames, visible error text, or all frames identical (frozen game) are automatic <=3. A live, animating game with visible objects scores high. Use the runtime telemetry too: captured errors or a missing ready signal cap this at 4.
- visualUsability: judge like a 9-year-old will play it. Text big enough to read at a glance? Player clearly distinguishable? Score visible? Overlapping/unreadable elements score low.
- briefFidelity: compare what you SEE against the design (genre, mechanic, visual style described). A great-looking game that isn't the designed game scores low here.
- learningAlignment: the educational content must be IN the interactive elements (words to catch, quantities to compare, categories to sort) — decorative theming alone scores <=4.

Verdict:
- approve: all scores >= 6 and no blockers.
- revise: fixable issues; every issue needs a code-actionable suggestion (these go directly to the repair model).
- reject: fundamentally broken or off-spec; regeneration is cheaper than repair.`;

export type JudgeInput = {
  design: GameDesign;
  screenshots: string[]; // data URLs
  runtime: {
    ready: boolean;
    errors: string[];
    lastScore: number | null;
  };
};

export type JudgeResult =
  | { ok: true; report: JudgeReport; latencyMs: number }
  | { ok: false; error: string };

export async function judgeGame(
  input: JudgeInput,
  apiKey: string,
): Promise<JudgeResult> {
  const t0 = Date.now();
  const openai = createOpenAI({ apiKey });

  const content: Array<
    { type: "text"; text: string } | { type: "image"; image: string }
  > = [
    {
      type: "text",
      text: `Game design spec:
${JSON.stringify(input.design, null, 2)}

Runtime telemetry:
- harness ready signal: ${input.runtime.ready ? "received" : "NOT received"}
- runtime errors: ${input.runtime.errors.length === 0 ? "none" : input.runtime.errors.slice(0, 5).join(" | ")}
- last reported score: ${input.runtime.lastScore ?? "never reported"}

The following ${input.screenshots.length} screenshots were captured in order during a ~6 second ghost playtest (random arrow keys, space, and taps). Judge the game.`,
    },
    ...input.screenshots.map((s) => ({ type: "image" as const, image: s })),
  ];

  try {
    const { object } = await generateObject({
      model: openai(JUDGE_MODEL),
      schema: JudgeReportSchema,
      system: JUDGE_SYSTEM,
      messages: [{ role: "user", content }],
      temperature: 0.2,
      maxRetries: 1,
    });
    return { ok: true, report: object, latencyMs: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Judge call failed",
    };
  }
}
