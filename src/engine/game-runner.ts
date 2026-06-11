// Code-gen game engine — the OpenGame-style path.
//
// Stage 1 (Game Designer): brief -> game design (concept, controls, config spec)
// Stage 2 (Builder): design -> Phaser 3 code for the template's two regions
// Static gate: syntax + banned APIs + contract checks, with one
// feedback-driven repair call before giving up.

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  type GameArtifact,
  GameCodeSchema,
  type GameDesign,
  GameDesignSchema,
} from "../game/schema";
import {
  PHASER_ARCADE_TEMPLATE,
  assembleGameHtml,
  getTemplate,
  templateForCompanionType,
  templateMenu,
} from "../game/template";
import { validateGameCode } from "../game/validate";
import { maskKey } from "./runner";
import type { EngineBrief, EngineMeta, StageRun } from "./types";

const DESIGN_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BUILDER_MODEL = process.env.OPENAI_BUILDER_MODEL ?? "gpt-4o";

export type GameEngineResult =
  | { ok: true; artifact: GameArtifact; meta: EngineMeta }
  | { ok: false; error: string; meta: EngineMeta };

function designerSystem(brief: EngineBrief): string {
  const preferred = templateForCompanionType(brief.companionType);
  const steer = preferred
    ? `\n\nTHE BRIEF'S COMPANION TYPE STRONGLY SUGGESTS templateId = "${preferred.id}". Only override if the topic genuinely demands a different template.`
    : "";
  return `You are the Game Designer stage of the AB Studios game engine.
Goal: turn a lesson brief into a tight, buildable 2D mini-game design.

PICK THE RIGHT TEMPLATE. Available templates:
${templateMenu()}

If templateId = "flashcard-quest" you MUST also produce:
- flashcardDeck: 10-20 cards specific to the lesson topic. Each card has prompt (≤6 words for K-2, ≤12 for older), correct (the answer the student picks), and 2-3 distractors that are plausible but wrong. Include explanation when there's a teaching moment in the wrong answers ("Almost! Whales breathe air — they're mammals.").
- theme: name, background (hex), accent (hex), mascotEmoji.

If templateId = "trail-master" you MUST also produce:
- trail: { destination, opening, steps[5-12] }. Each step is a scene + 2-3 choices where EXACTLY ONE is correct. Every choice (right and wrong) needs a consequence string — that's where the actual teaching happens. Wrong-choice consequences are gentle and explain the misconception ("Going against the current wears you out — water flows downhill because of gravity."); right-choice consequences celebrate and reinforce ("Yes! Gravity pulls the water along the steepest slope.").
- theme: name, background (hex), accent (hex), mascotEmoji.

GENERAL RULES:
- The core loop must TEACH the learning objective through play. Name the mapping in learningTieIn.
- Design for a 2-3 minute classroom session on a tablet or laptop. Simple controls (arrows/tap), instant restart.
- Visuals are shapes, colors, and emoji-as-sprites ONLY. Describe the look concretely in visualStyle.
- configSpec: 2-10 numeric tunables (speeds, intervals, targetCards, streakBonusEvery, etc.). Sensible defaults.
- Age-appropriate for the grade band. Playful, zero violence beyond cartoon dodging/collecting.${steer}

Output the design object only.`;
}

function builderSystem(templateId: string): string {
  const template = getTemplate(templateId) ?? PHASER_ARCADE_TEMPLATE;
  return `You are the Builder stage of the AB Studios game engine. You write complete, runnable Phaser 3 game code into a frozen template.

${template.contract}

QUALITY BAR:
- The game must be playable immediately: clear goal text on screen, score visible, win/end states, instant restart (SPACE or tap).
- Wire EVERY key from the design's configSpec into GAME_CONFIG and read it in the game code.
- If the design includes flashcardDeck/trail/theme, put them in GAME_CONFIG as \`deck\`/\`trail\`/\`theme\` and use them — do not invent your own.
- Emoji text objects make great sprites: this.add.text(x, y, "🦅", { fontSize: "40px" }).
- Use delta-time-safe movement (velocities via arcade physics, or dt-scaled manual movement) for any real-time game.
- Defensive coding: never index into arrays that might be empty; destroy offscreen objects; cap spawned object counts.
- The learning objective must surface in the mechanic, not just in flavor text.

Output the code object only: { configCode, gameCode }.`;
}

function designerPrompt(brief: EngineBrief): string {
  return `Lesson brief:

Topic: ${brief.topic}
Grade band: ${brief.gradeBand}
Subject: ${brief.subject}
Learning objective: ${brief.learningObjective}
Companion type (steer): ${brief.companionType}
Time available: ${brief.durationMinutes} minutes
${brief.tone ? `Tone: ${brief.tone}` : ""}
${brief.classroomConstraints ? `Classroom constraints: ${brief.classroomConstraints}` : ""}
${brief.sourceMaterial ? `Source material:\n${brief.sourceMaterial}` : ""}

Design the mini-game.`;
}

function builderPrompt(brief: EngineBrief, design: GameDesign): string {
  return `Lesson brief topic: ${brief.topic} (grade ${brief.gradeBand})
Learning objective: ${brief.learningObjective}

---
Game design to implement exactly (templateId=${design.templateId}):
${JSON.stringify(design, null, 2)}

Write the code.`;
}

export async function runGameEngine(
  brief: EngineBrief,
  apiKey: string,
): Promise<GameEngineResult> {
  const t0 = Date.now();
  const stages: StageRun[] = [];
  const keyFingerprint = maskKey(apiKey);
  const openai = createOpenAI({ apiKey });

  const fail = (error: string): GameEngineResult => ({
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
  });

  // ---- Stage 1: Game Designer ----
  let design: GameDesign;
  {
    const s0 = Date.now();
    try {
      const { object } = await generateObject({
        model: openai(DESIGN_MODEL),
        schema: GameDesignSchema,
        system: designerSystem(brief),
        prompt: designerPrompt(brief),
        temperature: 0.6,
        maxRetries: 1,
      });
      design = object;
      stages.push({
        name: "game-designer",
        model: DESIGN_MODEL,
        latencyMs: Date.now() - s0,
        attempt: 1,
        ok: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      stages.push({
        name: "game-designer",
        model: DESIGN_MODEL,
        latencyMs: Date.now() - s0,
        attempt: 1,
        ok: false,
        error: msg,
      });
      return fail(`Game Designer failed: ${msg}`);
    }
  }

  // ---- Stage 2: Builder, with one static-gate repair pass ----
  let lastProblems: string[] = [];
  let repairCount = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const s0 = Date.now();
    const prompt =
      attempt === 1
        ? builderPrompt(brief, design)
        : `${builderPrompt(brief, design)}

---
Your previous code failed static validation with ${lastProblems.length} problem(s). Fix EVERY one and resubmit the complete code:
${lastProblems.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
    try {
      const { object: code } = await generateObject({
        model: openai(BUILDER_MODEL),
        schema: GameCodeSchema,
        system: builderSystem(design.templateId),
        prompt,
        temperature: attempt === 1 ? 0.4 : 0.2,
        maxRetries: 1,
      });
      stages.push({
        name: "game-builder",
        model: BUILDER_MODEL,
        latencyMs: Date.now() - s0,
        attempt,
        ok: true,
      });

      const g0 = Date.now();
      const problems = validateGameCode(code, design);
      stages.push({
        name: "game-static-check",
        model: "static",
        latencyMs: Date.now() - g0,
        attempt,
        ok: problems.length === 0,
        error: problems.length > 0 ? problems.join("; ") : undefined,
      });

      if (problems.length === 0) {
        const artifact: GameArtifact = {
          templateId: design.templateId,
          title: design.title,
          design,
          code,
          html: assembleGameHtml(code.configCode, code.gameCode, design),
          createdAt: Date.now(),
          repairCount: 0,
        };
        return {
          ok: true,
          artifact,
          meta: {
            totalLatencyMs: Date.now() - t0,
            stages,
            revisionCount: repairCount,
            review: null,
            residualIssues: [],
            keyFingerprint,
          },
        };
      }
      lastProblems = problems;
      repairCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      stages.push({
        name: "game-builder",
        model: BUILDER_MODEL,
        latencyMs: Date.now() - s0,
        attempt,
        ok: false,
        error: msg,
      });
      lastProblems = [`Builder model call failed: ${msg}`];
      repairCount++;
    }
  }

  return fail(
    `Builder could not produce valid code after ${repairCount} repair attempt(s). Last problems: ${lastProblems.join("; ")}`,
  );
}

// ---- Runtime repair (the Debug Skill's verified-fix protocol) ----
//
// The sandboxed game crashed in the user's browser; the harness captured
// the exact runtime errors. Feed code + errors back to the Builder model
// for a targeted fix, re-validate statically, return a new artifact.

function repairSystem(templateId: string): string {
  const template = getTemplate(templateId) ?? PHASER_ARCADE_TEMPLATE;
  return `You are the Debug stage of the AB Studios game engine. A Phaser 3 game you wrote crashed at runtime inside its sandbox. You receive the complete current code and the exact runtime errors captured by the harness.

${template.contract}

REPAIR PROTOCOL:
- Diagnose each runtime error and apply the MINIMAL fix. Do not redesign the game, rename config keys, or change mechanics that already work.
- Common Phaser 3 pitfalls to check: using this.physics without enabling arcade physics in the config; touching objects in update() before create() has run; referencing destroyed objects; typos in Phaser API names; using scene callbacks with wrong \`this\` binding (use function() syntax registered via scene config, or arrow functions capturing the scene explicitly).
- Resubmit the COMPLETE corrected code for both blocks, not a diff.

Output the code object only: { configCode, gameCode }.`;
}

export type RepairResult =
  | { ok: true; artifact: GameArtifact; meta: EngineMeta }
  | { ok: false; error: string; meta: EngineMeta };

export async function repairGame(
  artifact: GameArtifact,
  runtimeErrors: string[],
  apiKey: string,
): Promise<RepairResult> {
  const t0 = Date.now();
  const stages: StageRun[] = [];
  const keyFingerprint = maskKey(apiKey);
  const openai = createOpenAI({ apiKey });

  const errBlock = runtimeErrors
    .slice(0, 10)
    .map((e, i) => `${i + 1}. ${e}`)
    .join("\n");

  let lastProblems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const s0 = Date.now();
    const staticSuffix =
      attempt === 1
        ? ""
        : `\n\n---\nYour previous repair failed static validation:\n${lastProblems.map((p, i) => `${i + 1}. ${p}`).join("\n")}\nFix those too.`;
    try {
      const { object: code } = await generateObject({
        model: openai(BUILDER_MODEL),
        schema: GameCodeSchema,
        system: repairSystem(artifact.templateId),
        prompt: `Game design:
${JSON.stringify(artifact.design, null, 2)}

---
Current configCode:
${artifact.code.configCode}

---
Current gameCode:
${artifact.code.gameCode}

---
RUNTIME ERRORS captured by the harness:
${errBlock}

Repair the code.${staticSuffix}`,
        temperature: 0.2,
        maxRetries: 1,
      });
      stages.push({
        name: "game-builder",
        model: BUILDER_MODEL,
        latencyMs: Date.now() - s0,
        attempt,
        ok: true,
      });
      const problems = validateGameCode(code, artifact.design);
      stages.push({
        name: "game-static-check",
        model: "static",
        latencyMs: 0,
        attempt,
        ok: problems.length === 0,
        error: problems.length > 0 ? problems.join("; ") : undefined,
      });
      if (problems.length === 0) {
        return {
          ok: true,
          artifact: {
            ...artifact,
            code,
            html: assembleGameHtml(
              code.configCode,
              code.gameCode,
              artifact.design,
            ),
            repairCount: (artifact.repairCount ?? 0) + 1,
          },
          meta: {
            totalLatencyMs: Date.now() - t0,
            stages,
            revisionCount: attempt,
            review: null,
            residualIssues: [],
            keyFingerprint,
          },
        };
      }
      lastProblems = problems;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      stages.push({
        name: "game-builder",
        model: BUILDER_MODEL,
        latencyMs: Date.now() - s0,
        attempt,
        ok: false,
        error: msg,
      });
      lastProblems = [`Repair model call failed: ${msg}`];
    }
  }

  return {
    ok: false,
    error: `Repair failed after 2 attempts: ${lastProblems.join("; ")}`,
    meta: {
      totalLatencyMs: Date.now() - t0,
      stages,
      revisionCount: 2,
      review: null,
      residualIssues: [],
      keyFingerprint,
    },
  };
}
