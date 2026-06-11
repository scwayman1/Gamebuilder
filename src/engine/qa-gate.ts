// Self-healing pedagogy gate.
//
// The deterministic QA checks (reading level, objective coverage, vocab,
// schema, formula health) used to surface only in the UI — runs that
// failed them still shipped. This module converts each failed check into
// a stage-targeted Critique in the existing Review schema, so the
// engine's revision loop can heal the run before publishing.

import { type Blueprint, evalFormula } from "../components/blueprint-schema";
import { runQa } from "../components/qa-checks";
import type { Critique, EngineBrief, Review } from "./types";

const GRADE_BAND_RANGES: Record<string, [number, number]> = {
  "K–2": [0, 2],
  "K-2": [0, 2],
  "3–5": [3, 5],
  "3-5": [3, 5],
  "6–8": [6, 8],
  "6-8": [6, 8],
  "9–12": [9, 12],
  "9-12": [9, 12],
};

// Map every failable QA check to (stage, severity, actionable suggestion).
// Severity escalates fail → blocker so the revision loop must run.
function qaCritiquesFromGroups(
  brief: EngineBrief,
  blueprint: Blueprint,
): Critique[] {
  const groups = runQa(blueprint);
  const critiques: Critique[] = [];
  const band = GRADE_BAND_RANGES[blueprint.gradeBand] ?? [3, 5];

  for (const g of groups) {
    for (const c of g.checks) {
      if (c.status !== "fail" && c.status !== "warn") continue;

      switch (c.id) {
        case "reading-level-intro": {
          critiques.push({
            stage: "writer",
            severity: c.status === "fail" ? "blocker" : "issue",
            problem: c.detail,
            suggestion: `Rewrite the student intro at a Flesch–Kincaid grade level between ${band[0]} and ${band[1]} for grade band "${blueprint.gradeBand}". Use short sentences (≤12 words), one- or two-syllable words, and concrete nouns. Same meaning, simpler words.`,
          });
          break;
        }
        case "intro-length": {
          critiques.push({
            stage: "writer",
            severity: c.status === "fail" ? "blocker" : "issue",
            problem: c.detail,
            suggestion:
              "Cut the student intro to at most 35 words. One inviting sentence is ideal; two short sentences max.",
          });
          break;
        }
        case "objective-coverage": {
          critiques.push({
            stage: "writer",
            severity: c.status === "fail" ? "blocker" : "issue",
            problem: c.detail,
            suggestion: `For each learning objective, ensure at least one of: a scene that names the concept, an assessment prompt that asks about it, a tip that mentions it. Objectives: ${blueprint.learningObjectives
              .map((o) => `"${o}"`)
              .join("; ")}.`,
          });
          break;
        }
        case "vocab-used": {
          const copy = [
            blueprint.studentIntro,
            ...blueprint.assessments,
            ...blueprint.tips,
            ...blueprint.scenes.map((s) => s.goal),
          ]
            .join(" ")
            .toLowerCase();
          const missing = blueprint.vocabulary
            .filter((v) => !copy.includes(v.term.toLowerCase()))
            .map((v) => v.term);
          critiques.push({
            stage: "writer",
            severity: c.status === "fail" ? "blocker" : "issue",
            problem: c.detail,
            suggestion: `Use these vocabulary terms verbatim somewhere in the studentIntro, assessments, or tips: ${missing
              .map((t) => `"${t}"`)
              .join(", ")}. Define them where you introduce them.`,
          });
          break;
        }
        case "schema-valid": {
          critiques.push({
            stage: "mechanic",
            severity: "blocker",
            problem: c.detail,
            suggestion:
              "Fix each structural issue in variables/outcomes: ensure min<default<max, exactly one isPrimary, and that every formula evaluates finite at the (min, default, max) grid.",
          });
          break;
        }
        case "primary-magnitude": {
          critiques.push({
            stage: "mechanic",
            severity: c.status === "fail" ? "blocker" : "issue",
            problem: c.detail,
            suggestion: `Recalibrate the primary outcome's formula constants so the value at default slider positions lands in a teachable range for the unit (e.g., distance 0–30 m, percent 0–100, score 0–100). Avoid near-zero and >10⁴ values at defaults.`,
          });
          break;
        }
        case "variables-influence-primary": {
          critiques.push({
            stage: "mechanic",
            severity: c.status === "fail" ? "blocker" : "issue",
            problem: c.detail,
            suggestion:
              "Rewrite the primary outcome formula so EVERY variable measurably moves it from min to max (the bench computes |f(max) - f(default)| and |f(min) - f(default)| and requires both > 1e-6). Add the missing variables as terms with non-trivial coefficients.",
          });
          break;
        }
        case "tip-count":
        case "assessments-count":
        case "teacher-prep":
        case "sources": {
          // Surface coverage shortfalls as nits — the engine notes them
          // in residual issues but doesn't burn a revision pass on them.
          critiques.push({
            stage: "writer",
            severity: "nit",
            problem: c.detail,
            suggestion: tipForCoverage(c.id),
          });
          break;
        }
        default:
          // Unknown check ids ride through as nits so the loop ignores
          // them, but they still appear in residualIssues.
          critiques.push({
            stage: "writer",
            severity: "nit",
            problem: c.detail,
            suggestion: "Address this QA check before publishing.",
          });
      }
    }
  }

  // Brief-level: if the topic isn't paper airplane but the intro mentions
  // them, force a writer revision. Catches the most embarrassing failure
  // mode the LLM Reviewer often misses.
  const topicTokens = brief.topic.toLowerCase();
  const intro = blueprint.studentIntro.toLowerCase();
  if (
    !/paper\s*airplane|paper\s*plane/.test(topicTokens) &&
    /paper\s*airplane|paper\s*plane/.test(intro)
  ) {
    critiques.push({
      stage: "writer",
      severity: "blocker",
      problem:
        "Student intro mentions paper airplanes, but the brief's topic is not paper airplanes.",
      suggestion: `Rewrite the intro grounded in the actual topic: "${brief.topic}". Do not borrow examples from other topics.`,
    });
  }

  // Default-time formula-finiteness backstop. The mechanic gate now
  // checks this too, but the rescue path can still ship a NaN-at-defaults
  // outcome that repairFormulas couldn't fix — that surfaces here as a
  // blocker so the human sees it instead of a NaN render.
  const defaults: Record<string, number> = {};
  for (const v of blueprint.variables) defaults[v.id] = v.default;
  for (const o of blueprint.outcomes) {
    if (!Number.isFinite(evalFormula(o.formula, defaults))) {
      critiques.push({
        stage: "mechanic",
        severity: "blocker",
        problem: `Outcome "${o.label}" is NaN at default slider positions — students will see NaN on first render.`,
        suggestion: `Rewrite the formula so it is finite at defaults ${JSON.stringify(defaults)}. Guard divisions with Math.max(1, x); guard logs with Math.log(1 + Math.max(0, x)).`,
      });
    }
  }

  return critiques;
}

function tipForCoverage(id: string): string {
  switch (id) {
    case "tip-count":
      return "Add 'Did You Know?' tips until there are at least 3.";
    case "assessments-count":
      return "Add reflection prompts until there are at least 3.";
    case "teacher-prep":
      return "Make each teacherPrep item a complete instruction (≥4 words).";
    case "sources":
      return "Cite at least one source for the student-facing claims.";
    default:
      return "";
  }
}

export type QaGateResult = {
  critiques: Critique[];
  needsRevision: boolean;
};

// Returns the critiques and whether the engine should run another revision
// pass. The loop only revises on issue/blocker severity — nits ride
// through as residual issues and surface in the UI without burning a
// model call.
export function qaGate(brief: EngineBrief, blueprint: Blueprint): QaGateResult {
  const critiques = qaCritiquesFromGroups(brief, blueprint);
  const needsRevision = critiques.some((c) => c.severity !== "nit");
  return { critiques, needsRevision };
}

// Convert critiques into a synthetic Review so the existing
// revisionInstruction() and revision loop machinery can consume them.
export function asSyntheticReview(
  critiques: Critique[],
  priorReview: Review | null,
): Review {
  return {
    verdict: critiques.some((c) => c.severity === "blocker")
      ? "revise"
      : "revise",
    scores: priorReview?.scores ?? {
      pedagogy: 6,
      mechanic: 6,
      copy: 6,
      classroomFit: 6,
    },
    critiques,
    summary: `Deterministic QA gate found ${critiques.length} issue(s) needing revision.`,
  };
}
