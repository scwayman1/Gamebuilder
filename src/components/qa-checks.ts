import {
  type Blueprint,
  evalFormula,
  validateBlueprint,
} from "./blueprint-schema";

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export type QaCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

export type QaGroup = {
  title: string;
  checks: QaCheck[];
};

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

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

function fleschKincaidGrade(text: string): number | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = cleaned.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (sentences.length === 0 || words.length === 0) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return (
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59
  );
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
}

function readingLevelCheck(blueprint: Blueprint): QaCheck {
  const band = GRADE_BAND_RANGES[blueprint.gradeBand];
  const introGrade = fleschKincaidGrade(blueprint.studentIntro);
  if (introGrade === null || !band) {
    return {
      id: "reading-level-intro",
      label: "Student intro reading level",
      status: "info",
      detail: "Grade band not recognized; skipping reading-level check.",
    };
  }
  const [bandLow, bandHigh] = band;
  let status: CheckStatus = "pass";
  let detail = `Flesch-Kincaid grade ${introGrade.toFixed(1)} (band ${bandLow}–${bandHigh}).`;
  if (introGrade > bandHigh + 2) {
    status = "fail";
    detail += " Significantly above grade band.";
  } else if (introGrade > bandHigh) {
    status = "warn";
    detail += " Above the grade band.";
  } else if (introGrade < bandLow - 2 && bandLow > 0) {
    status = "warn";
    detail += " Below the grade band — may feel babyish.";
  }
  return {
    id: "reading-level-intro",
    label: "Student intro reading level fits grade band",
    status,
    detail,
  };
}

function introLengthCheck(blueprint: Blueprint): QaCheck {
  const n = wordCount(blueprint.studentIntro);
  return {
    id: "intro-length",
    label: "Student intro is concise (≤ 35 words)",
    status: n > 50 ? "fail" : n > 35 ? "warn" : "pass",
    detail: `${n} words.`,
  };
}

function objectiveCoverageCheck(blueprint: Blueprint): QaCheck {
  const haystack = [
    ...blueprint.scenes.map((s) => `${s.label} ${s.goal}`),
    ...blueprint.assessments,
    ...blueprint.tips,
    blueprint.studentIntro,
  ]
    .join(" ")
    .toLowerCase();
  const coverage = blueprint.learningObjectives.map((o) => {
    const keywords = tokenize(o).slice(0, 4);
    return keywords.some((k) => haystack.includes(k));
  });
  const missed = coverage.filter((hit) => !hit).length;
  return {
    id: "objective-coverage",
    label: "Every objective reinforced by a scene or prompt",
    status: missed === 0 ? "pass" : missed === 1 ? "warn" : "fail",
    detail:
      missed === 0
        ? `${coverage.length}/${coverage.length} objectives reinforced.`
        : `${missed} objective${missed === 1 ? "" : "s"} not echoed in scenes/prompts/tips.`,
  };
}

function vocabUsageCheck(blueprint: Blueprint): QaCheck {
  const copy = [
    blueprint.studentIntro,
    ...blueprint.assessments,
    ...blueprint.tips,
    ...blueprint.scenes.map((s) => s.goal),
  ]
    .join(" ")
    .toLowerCase();
  const total = blueprint.vocabulary.length;
  const hits = blueprint.vocabulary.filter((v) =>
    copy.includes(v.term.toLowerCase()),
  ).length;
  return {
    id: "vocab-used",
    label: "Vocabulary terms used in lesson copy",
    status:
      hits === total
        ? "pass"
        : hits >= Math.ceil(total * 0.5)
          ? "warn"
          : "fail",
    detail: `${hits}/${total} terms appear in the student-facing copy.`,
  };
}

function schemaCheck(blueprint: Blueprint): QaCheck {
  const issues = validateBlueprint(blueprint);
  return {
    id: "schema-valid",
    label: "Blueprint passes schema validation",
    status: issues.length === 0 ? "pass" : "fail",
    detail:
      issues.length === 0
        ? "No structural issues."
        : `${issues.length} issue(s): ${issues
            .slice(0, 3)
            .map((i) => `${i.path} – ${i.problem}`)
            .join("; ")}${issues.length > 3 ? "…" : ""}`,
  };
}

function defaultValues(blueprint: Blueprint): Record<string, number> {
  const d: Record<string, number> = {};
  for (const v of blueprint.variables) d[v.id] = v.default;
  return d;
}

function primaryMagnitudeCheck(blueprint: Blueprint): QaCheck | null {
  const primary = blueprint.outcomes.find((o) => o.isPrimary);
  if (!primary) return null;
  const val = evalFormula(primary.formula, defaultValues(blueprint));
  if (!Number.isFinite(val)) {
    return {
      id: "primary-magnitude",
      label: "Primary outcome lands in a teachable range at defaults",
      status: "fail",
      detail: `Primary "${primary.label}" is not finite at default values.`,
    };
  }
  let status: CheckStatus = "pass";
  let detail = `Primary "${primary.label}" = ${val.toFixed(2)} ${primary.unit} at defaults.`;
  if (Math.abs(val) < 0.01) {
    status = "warn";
    detail += " Very close to zero — students may not see a result.";
  } else if (Math.abs(val) > 1e4) {
    status = "warn";
    detail += " Very large — display may overflow.";
  }
  return {
    id: "primary-magnitude",
    label: "Primary outcome lands in a teachable range at defaults",
    status,
    detail,
  };
}

function variableInfluenceCheck(blueprint: Blueprint): QaCheck | null {
  const primary = blueprint.outcomes.find((o) => o.isPrimary);
  if (!primary) return null;
  const defaults = defaultValues(blueprint);
  const baseline = evalFormula(primary.formula, defaults);
  const inert: string[] = [];
  for (const v of blueprint.variables) {
    const high = evalFormula(primary.formula, { ...defaults, [v.id]: v.max });
    const low = evalFormula(primary.formula, { ...defaults, [v.id]: v.min });
    const diff = Math.max(Math.abs(high - baseline), Math.abs(low - baseline));
    if (!Number.isFinite(diff) || diff < 1e-6) inert.push(v.label);
  }
  return {
    id: "variables-influence-primary",
    label: "Every variable measurably affects the primary outcome",
    status: inert.length === 0 ? "pass" : inert.length === 1 ? "warn" : "fail",
    detail:
      inert.length === 0
        ? `All ${blueprint.variables.length} variables move the primary outcome.`
        : `${inert.length} variable(s) don't appear to affect "${primary.label}": ${inert.join(", ")}.`,
  };
}

function coverageGroup(blueprint: Blueprint): QaGroup {
  const teacherAvg =
    blueprint.teacherPrep.reduce((s, p) => s + wordCount(p), 0) /
    Math.max(1, blueprint.teacherPrep.length);
  return {
    title: "Coverage",
    checks: [
      {
        id: "tip-count",
        label: "At least 3 'Did You Know?' tips",
        status: blueprint.tips.length >= 3 ? "pass" : "warn",
        detail: `${blueprint.tips.length} tips.`,
      },
      {
        id: "assessments-count",
        label: "At least 3 reflection/assessment prompts",
        status: blueprint.assessments.length >= 3 ? "pass" : "warn",
        detail: `${blueprint.assessments.length} prompts.`,
      },
      {
        id: "teacher-prep",
        label: "Teacher prep is specific and finite",
        status: blueprint.teacherPrep.every((p) => wordCount(p) >= 4)
          ? "pass"
          : "warn",
        detail: `Each item should be a complete instruction. Average ${teacherAvg.toFixed(1)} words.`,
      },
      {
        id: "sources",
        label: "Source attribution present",
        status: blueprint.sourceAttribution.length > 0 ? "pass" : "warn",
        detail:
          blueprint.sourceAttribution.length > 0
            ? `${blueprint.sourceAttribution.length} source(s) cited.`
            : "No sources cited — student-facing claims need provenance.",
      },
    ],
  };
}

const deferredGroup: QaGroup = {
  title: "Deferred to factuality reviewer",
  checks: [
    {
      id: "factuality",
      label: "Claims fact-checked against source material",
      status: "info",
      detail:
        "Heuristic checks don't verify facts. A reviewer LLM pass is the next step.",
    },
    {
      id: "accessibility-audit",
      label: "Full accessibility audit (axe-core, screen reader, keyboard)",
      status: "info",
      detail: "Static heuristics only; full audit runs after deploy.",
    },
  ],
};

export function runQa(blueprint: Blueprint): QaGroup[] {
  const pedagogy: QaCheck[] = [
    readingLevelCheck(blueprint),
    introLengthCheck(blueprint),
    objectiveCoverageCheck(blueprint),
    vocabUsageCheck(blueprint),
  ];
  const mechanics: QaCheck[] = [schemaCheck(blueprint)];
  const primary = primaryMagnitudeCheck(blueprint);
  if (primary) mechanics.push(primary);
  const influence = variableInfluenceCheck(blueprint);
  if (influence) mechanics.push(influence);
  return [
    { title: "Pedagogy", checks: pedagogy },
    { title: "Schema & mechanics", checks: mechanics },
    coverageGroup(blueprint),
    deferredGroup,
  ];
}

export function summarize(groups: QaGroup[]) {
  let pass = 0;
  let warn = 0;
  let fail = 0;
  let info = 0;
  for (const g of groups) {
    for (const c of g.checks) {
      if (c.status === "pass") pass++;
      else if (c.status === "warn") warn++;
      else if (c.status === "fail") fail++;
      else info++;
    }
  }
  return { pass, warn, fail, info };
}
