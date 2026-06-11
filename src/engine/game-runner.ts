// Code-gen game engine — the OpenGame-style path.
//
// Stage 1 (Game Designer): brief -> game design (concept, controls, config spec)
// Stage 2 (Builder): design -> Phaser 3 code for the template's two regions
// Static gate: syntax + banned APIs + contract checks, with one
// feedback-driven repair call before giving up.

import {
  type GameArtifact,
  GameCodeSchema,
  type GameDesign,
  GameDesignSchema,
} from "@/game/schema";
import { PHASER_ARCADE_TEMPLATE, assembleGameHtml } from "@/game/template";
import { validateGameCode } from "@/game/validate";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { maskKey } from "./runner";
import type { EngineBrief, EngineMeta, StageRun } from "./types";

const DESIGN_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BUILDER_MODEL = process.env.OPENAI_BUILDER_MODEL ?? "gpt-4o";

export type GameEngineResult =
  | { ok: true; artifact: GameArtifact; meta: EngineMeta }
  | { ok: false; error: string; meta: EngineMeta };

const DESIGNER_SYSTEM = `You are the Game Designer stage of the AB Studios game engine.
Goal: turn a lesson brief into a tight, buildable 2D arcade mini-game design.

Rules:
- The core loop must TEACH the learning objective through play, not decorate it. Name the mapping explicitly in learningTieIn.
- Design for a 2-3 minute classroom session on a tablet or laptop. Simple controls (arrows/tap), instant restart.
- Visuals are shapes, colors, and emoji-as-sprites ONLY. No image assets exist. Describe the look concretely in visualStyle.
- configSpec: 3-10 numeric tunables the builder must wire through (speeds, spawn intervals, points-to-win). Sensible defaults.
- Age-appropriate for the grade band. Playful, zero violence beyond cartoon dodging/collecting.

Output the design object only.`;

const BUILDER_SYSTEM = `You are the Builder stage of the AB Studios game engine. You write complete, runnable Phaser 3 game code into a frozen template.

${PHASER_ARCADE_TEMPLATE.contract}

QUALITY BAR:
- The game must be playable immediately: clear goal text on screen, score visible, win and lose states, instant restart (SPACE or tap).
- Wire EVERY key from the design's configSpec into GAME_CONFIG and read it in the game code.
- Emoji text objects make great sprites: this.add.text(x, y, "🦅", { fontSize: "40px" }).
- Use delta-time-safe movement (velocities via arcade physics, or dt-scaled manual movement).
- Defensive coding: never index into arrays that might be empty; destroy offscreen objects; cap spawned object counts.
- The learning objective must surface in the mechanic (e.g., catching correct answers, sorting items, matching forces), not just in flavor text.

Output the code object only: { configCode, gameCode }.`;

function designerPrompt(brief: EngineBrief): string {
  return `Lesson brief:

Topic: ${brief.topic}
Grade band: ${brief.gradeBand}
Subject: ${brief.subject}
Learning objective: ${brief.learningObjective}
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
Game design to implement exactly:
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
        system: DESIGNER_SYSTEM,
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
        system: BUILDER_SYSTEM,
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
          templateId: PHASER_ARCADE_TEMPLATE.id,
          title: design.title,
          design,
          html: assembleGameHtml(code.configCode, code.gameCode),
          createdAt: Date.now(),
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
