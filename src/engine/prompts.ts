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
- Tailor everything to the SPECIFIC topic in the brief. Do NOT default to paper airplanes, paper, planes, flight, wings, throw power, wing angle, or nose weight unless the brief literally names them.
- Variable and outcome ids MUST relate to the brief's topic. If the topic is football, ids should be football-related (throwPower, releaseAngle, spinRate, …). If the topic is ecology, ids should be ecology-related (preyBirthRate, predatorCount, foodSupply, …).
- Pick visualizationKind:
  - "projectile" for distance/range topics (throwing, launching, flying, kicking, falling) — primary outcome will have a linear distance unit.
  - "bars" for percentage/score/accuracy/balance/yield topics, or anything without horizontal motion.
- Pick 3–5 variables. camelCase ids. For each variable, write a "rangeHint" in plain English with a sense of the useful range and unit.
- Pick 2–3 outcomes. Mark EXACTLY ONE as isPrimary. For each, write an "intent" sentence telling the Mechanic Designer what it should measure and how it should respond to variables.
- 1–4 scenes describing the lesson phases.
- 2–5 specific learning objectives.

EXAMPLE 1 — brief topic: "Throwing a football, grade 6, projectile motion"
visualizationKind: "projectile"
variableSeeds: [
  { id: "throwPower",   label: "Throw power",   rangeHint: "percent 0–100, default ~70" },
  { id: "releaseAngle", label: "Release angle", rangeHint: "degrees 10–70, default ~35" },
  { id: "spinRate",     label: "Spin rate",     rangeHint: "revs per sec 0–100, default ~60" },
  { id: "wind",         label: "Wind",          rangeHint: "mph -20 to 20, default 0" }
]
outcomeSeeds: [
  { id: "distance",       label: "Distance",        unit: "m", isPrimary: true,  intent: "How far the football lands; rises with throwPower and ~sin(2·releaseAngle), shifted by wind." },
  { id: "spiralAccuracy", label: "Spiral accuracy", unit: "%", isPrimary: false, intent: "How tight the spiral lands; rises with spinRate, drops with extreme releaseAngle." }
]

EXAMPLE 2 — brief topic: "Levers and mechanical advantage, grade 5"
visualizationKind: "bars"
variableSeeds: [
  { id: "loadWeight",      label: "Load weight",      rangeHint: "kg 1–50, default ~10" },
  { id: "effortDistance",  label: "Effort arm length", rangeHint: "cm 10–200, default ~80" },
  { id: "loadDistance",    label: "Load arm length",  rangeHint: "cm 5–100, default ~20" }
]
outcomeSeeds: [
  { id: "mechanicalAdvantage", label: "Mechanical advantage", unit: "x",  isPrimary: true,  intent: "Effort arm divided by load arm; how much the lever multiplies force." },
  { id: "effortForce",         label: "Effort needed",        unit: "N", isPrimary: false, intent: "Force the user must apply; load * loadDistance / effortDistance * 9.81." }
]

Output the plan only — no preamble, no markdown.`;

export function plannerUserPrompt(brief: EngineBrief): string {
  return `Lesson brief:\n\n${describeBrief(brief)}\n\nProduce the plan.`;
}

// ---- Mechanic Designer ----
export const MECHANIC_SYSTEM = `You are the Mechanic Designer stage of the AB Studios learning module engine.
Goal: turn a plan into a fully specified simulation mechanic — concrete variable ranges and outcome formulas.

You produce variables, outcomes (with formulas), and planner-identified risks. You do NOT touch copy, assessments, or scenes.

CRITICAL Rules:
- Use EXACTLY the variable ids the Planner provided in variableSeeds. Do not rename, casefix, or invent new ones. The same applies to outcome ids in outcomeSeeds.
- Every formula MUST reference ONLY ids that exist in your variables array — never the LABEL, never a slug of the label, never something the Planner didn't define. Cross-check each formula against your own variables list before emitting.
- Allowed tokens in formula: numerals, the variable ids you defined, parentheses, + - * /, Math.abs, Math.sin, Math.cos, Math.min, Math.max, Math.pow, Math.sqrt, Math.PI. NOTHING ELSE — no other identifiers, no semicolons, no statements, no ternaries, no if.
- Formulas must evaluate to a FINITE NUMBER and to a NON-CONSTANT value across the (min, default, max) ranges of the variables. Slider changes must visibly change outcomes. Wrap risky ops with Math.max(0, …) to avoid negatives where appropriate.
- For each variable: pick min < default < max so the slider is useful across its whole range. Include a 'unit' if applicable. Write a kid-friendly 'studentExplanation'.
- Mark EXACTLY ONE outcome with isPrimary: true (matching the Planner's pick if specified). Every other outcome must have isPrimary: false.
- Calibrate constants so the defaults result is meaningful — not zero, not absurd. Aim for distance 0–30 m, time 0–4 s, percent 0–100, score 0–100.
- Risks: 1–3 honest things the content team should know.

EXAMPLE — given Planner output for "Throwing a football":
variables: [
  { id: "throwPower",   label: "Throw power",   min: 30, max: 100, default: 70, unit: "%",  studentExplanation: "How hard you throw the ball." },
  { id: "releaseAngle", label: "Release angle", min: 10, max: 70,  default: 35, unit: "°",  studentExplanation: "The angle above horizontal when you let go." },
  { id: "spinRate",     label: "Spin rate",     min: 0,  max: 100, default: 60, unit: "rps", studentExplanation: "How fast the ball is spinning." },
  { id: "wind",         label: "Wind",          min: -20, max: 20, default: 0,  unit: "mph", studentExplanation: "Negative is a headwind, positive is a tailwind." }
],
outcomes: [
  { id: "distance",       label: "Distance",        unit: "m", isPrimary: true,
    formula: "Math.max(0, (throwPower/100) * 45 * Math.sin(2 * releaseAngle * Math.PI / 180) + wind * 0.3)" },
  { id: "spiralAccuracy", label: "Spiral accuracy", unit: "%", isPrimary: false,
    formula: "Math.max(0, Math.min(100, 40 + spinRate * 0.6 - Math.abs(releaseAngle - 35) * 0.8))" }
]

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
