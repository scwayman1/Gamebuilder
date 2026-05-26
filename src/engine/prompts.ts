import type { EngineBrief, Mechanic, Plan, Review } from "./types";

export function describeBrief(brief: EngineBrief): string {
  return [
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
    brief.accessibility?.length
      ? `Accessibility: ${brief.accessibility.join(", ")}`
      : "",
    brief.similarModules
      ? `Similar modules to imitate: ${brief.similarModules}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---- Planner ----
export const PLANNER_SYSTEM = `You are the Planner stage of the AB Studios learning module engine.
Goal: turn a content team brief into a high-level plan that the rest of the engine will flesh out.

You produce the plan only. You do NOT write formulas, copy, or assessments — other specialists do that.

Rules:
- Tailor everything to the SPECIFIC topic in the brief. Don't default to paper airplanes.
- Pick visualizationKind:
  - "projectile" for distance/range topics (throwing, launching, flying, kicking, falling). Use when the primary outcome will have a linear distance unit.
  - "bars" for percentage/score/accuracy topics, or anything without horizontal motion.
- Pick 3–5 variables. camelCase ids. For each variable, write a "rangeHint" in plain English with a sense of the useful range and unit (the Mechanic Designer will choose concrete numbers).
- Pick 2–3 outcomes. Mark EXACTLY ONE as isPrimary. For each, write an "intent" sentence telling the Mechanic Designer what it should measure and how it should respond to variables.
- 1–4 scenes describing the lesson phases.
- 2–5 specific learning objectives.

Output the plan only — no preamble, no markdown.`;

export function plannerUserPrompt(brief: EngineBrief): string {
  return `Lesson brief:\n\n${describeBrief(brief)}\n\nProduce the plan.`;
}

// ---- Mechanic Designer ----
export const MECHANIC_SYSTEM = `You are the Mechanic Designer stage of the AB Studios learning module engine.
Goal: turn a plan into a fully specified simulation mechanic — concrete variable ranges and outcome formulas.

You produce variables, outcomes (with formulas), and planner-identified risks. You do NOT touch copy, assessments, or scenes.

Rules:
- Use exactly the variable ids and outcome ids the Planner specified. Do not rename or invent new ones.
- For each variable: pick min < default < max so the slider is useful across its whole range. Include a 'unit' if applicable. Write a kid-friendly 'studentExplanation'.
- For each outcome: produce a 'formula' that is a JS expression referencing ONLY the variable ids you defined and Math. Allowed: + - * / parentheses, Math.abs / sin / cos / min / max / pow / sqrt / PI. NOTHING ELSE.
- Formulas must evaluate to a finite number at every combination of (min, default, max) per variable. Use Math.max(0, …) to guard against negatives where appropriate.
- Calibrate constants so a typical defaults result is meaningful — not zero, not absurdly large. Aim for distance 0–30 m, time 0–4 s, percent 0–100.
- Mark exactly one outcome with isPrimary: true (matching the Planner's pick if specified).
- Risks: 1–3 honest things the content team should know.

Output the mechanic object only.`;

export function mechanicUserPrompt(brief: EngineBrief, plan: Plan): string {
  return `Lesson brief:\n\n${describeBrief(brief)}\n\n---\nPlanner output (you MUST use these ids):\n${JSON.stringify(
    {
      visualizationKind: plan.visualizationKind,
      variableSeeds: plan.variableSeeds,
      outcomeSeeds: plan.outcomeSeeds,
      scenes: plan.scenes,
      learningObjectives: plan.learningObjectives,
    },
    null,
    2,
  )}\n\nProduce the mechanic.`;
}

// ---- Content Writer ----
export const WRITER_SYSTEM = `You are the Content Writer stage of the AB Studios learning module engine.
Goal: produce student- and teacher-facing copy that matches the Planner's plan and the Mechanic Designer's mechanic.

You produce: studentIntro, teacherPrep, materials, assessments, tips, vocabulary, sourceAttribution.

Rules:
- studentIntro: one sentence, second person, age-appropriate for the grade band, concrete and inviting.
- teacherPrep: 2–5 full instructions a teacher could actually follow.
- assessments: 3–6 open-ended student prompts that reference variables, outcomes, or the mechanic by name.
- tips: 3–6 short "Did You Know?" facts grounded in the topic and outcomes.
- vocabulary: 2–6 kid-friendly definitions of terms the student will encounter.
- sourceAttribution: cite real sources when possible (curriculum frameworks, agency guides). If none, return an empty array.
- materials: physical or digital materials the classroom needs.
- Tone: playful, curious, classroom-safe. Use the variable labels and outcome labels by name where natural.

Output the content object only — no preamble.`;

export function writerUserPrompt(
  brief: EngineBrief,
  plan: Plan,
  mechanic: Mechanic,
): string {
  return `Lesson brief:\n\n${describeBrief(brief)}\n\n---\nPlan summary:\n${JSON.stringify(
    {
      moduleTitle: plan.moduleTitle,
      learningObjectives: plan.learningObjectives,
      scenes: plan.scenes,
      standards: plan.standards,
    },
    null,
    2,
  )}\n\n---\nMechanic summary:\n${JSON.stringify(
    {
      variables: mechanic.variables.map((v) => ({
        id: v.id,
        label: v.label,
        unit: v.unit,
      })),
      outcomes: mechanic.outcomes.map((o) => ({
        id: o.id,
        label: o.label,
        unit: o.unit,
        isPrimary: o.isPrimary,
      })),
    },
    null,
    2,
  )}\n\nProduce the content.`;
}

// ---- Reviewer ----
export const REVIEWER_SYSTEM = `You are the Reviewer stage of the AB Studios learning module engine.
Goal: critique the assembled blueprint against the brief and decide whether it can ship.

Rules:
- Score 0–10 on: pedagogy (does the mechanic teach the objective?), mechanic (are formulas sensible and do the SAMPLED OUTPUTS shown to you span a meaningful range?), copy (clear, on-grade, on-brand?), classroomFit (realistic for the constraints?).
- Verdict:
  - "approve" if every score >= 6 and there are no blockers.
  - "revise" if 1–3 issues that can be fixed by re-running specific stages.
  - "reject" if pedagogically off-target or factually unsound such that revision can't fix.
- BLOCKERS (mark as severity:"blocker" and verdict:"revise"):
  - Any outcome is identical or near-identical across the sample inputs shown — that means moving sliders does nothing, the mechanic is broken.
  - Any outcome stays at 0 across all samples — the mechanic produces no signal.
  - Primary outcome is implausible for the topic (e.g., negative distance, distances in millions of meters).
  - Student intro defaults to paper airplanes when the topic is not paper airplanes.
- Critiques: for each problem, name the stage (planner|mechanic|writer), severity (nit|issue|blocker), the problem, and a concrete suggestion the targeted stage can act on.
- Summary: one-sentence overall judgment for a human reviewer.

Output the review object only.`;

export type SampleEvaluation = {
  label: string; // e.g. "defaults", "all-min", "throwPower at max"
  variables: Record<string, number>;
  outcomes: Record<string, number | "NaN">;
};

export function reviewerUserPrompt(
  brief: EngineBrief,
  plan: Plan,
  mechanic: Mechanic,
  content: { studentIntro: string; assessments: string[]; tips: string[] },
  samples: SampleEvaluation[],
): string {
  return `Brief:\n${describeBrief(brief)}\n\n---\nAssembled blueprint:\n${JSON.stringify(
    {
      moduleTitle: plan.moduleTitle,
      template: plan.template,
      gradeBand: plan.gradeBand,
      learningObjectives: plan.learningObjectives,
      scenes: plan.scenes,
      variables: mechanic.variables,
      outcomes: mechanic.outcomes,
      risks: mechanic.risks,
      studentIntro: content.studentIntro,
      assessments: content.assessments,
      tips: content.tips,
    },
    null,
    2,
  )}\n\n---\nSAMPLED OUTPUTS (the engine evaluated the formulas at these slider positions; use this to judge whether outcomes actually vary):\n${JSON.stringify(samples, null, 2)}\n\nReview it.`;
}

// Used when re-running a stage with critic feedback
export function revisionInstruction(
  stage: "planner" | "mechanic" | "writer",
  review: Review,
): string {
  const targeted = review.critiques.filter((c) => c.stage === stage);
  if (targeted.length === 0) return "";
  return `\n\n---\nThe Reviewer flagged the following ${targeted.length} issue(s) in your prior output. Fix them in this revision:\n${targeted
    .map(
      (c, i) =>
        `${i + 1}. [${c.severity}] ${c.problem}\n   Suggestion: ${c.suggestion}`,
    )
    .join("\n")}`;
}
