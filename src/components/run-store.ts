"use client";

import { type Blueprint, BlueprintSchema } from "./blueprint-schema";
import { paperAirplaneBlueprint } from "./mock-blueprint";

export type BriefInput = {
  topic: string;
  gradeBand: string;
  subject: string;
  learningObjective: string;
  sourceMaterial: string;
  companionType: string;
  durationMinutes: number;
  classroomConstraints: string;
  standards: string;
  tone: string;
  accessibility: string[];
  similarModules: string;
};

export const defaultBrief: BriefInput = {
  topic: "",
  gradeBand: "3–5",
  subject: "",
  learningObjective: "",
  sourceMaterial: "",
  companionType: "Simulation Lab",
  durationMinutes: 20,
  classroomConstraints: "",
  standards: "",
  tone: "Playful, curious, classroom-safe.",
  accessibility: ["Keyboard nav", "High-contrast", "Reduced motion"],
  similarModules: "",
};

const BRIEF_PREFIX = "scotts-experiment:brief:";
const BLUEPRINT_PREFIX = "scotts-experiment:blueprint:";
const INDEX_KEY = "scotts-experiment:run-index";

export type RunIndexEntry = {
  id: string;
  topic: string;
  gradeBand: string;
  durationMinutes: number;
  createdAt: number;
};

export function saveBrief(runId: string, brief: BriefInput) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRIEF_PREFIX + runId, JSON.stringify(brief));
  upsertRunIndex({
    id: runId,
    topic: brief.topic,
    gradeBand: brief.gradeBand,
    durationMinutes: brief.durationMinutes,
    createdAt: Date.now(),
  });
}

function upsertRunIndex(entry: RunIndexEntry) {
  const all = listRuns();
  const without = all.filter((e) => e.id !== entry.id);
  const next = [entry, ...without].slice(0, 50);
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

export function listRuns(): RunIndexEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RunIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function deleteRun(runId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BRIEF_PREFIX + runId);
  window.localStorage.removeItem(BLUEPRINT_PREFIX + runId);
  const next = listRuns().filter((e) => e.id !== runId);
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

export function loadBrief(runId: string): BriefInput | null {
  if (typeof window === "undefined") return null;
  if (runId === "demo-paper-airplane") return defaultBrief;
  const raw = window.localStorage.getItem(BRIEF_PREFIX + runId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BriefInput;
  } catch {
    return null;
  }
}

export function saveBlueprint(runId: string, blueprint: Blueprint) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BLUEPRINT_PREFIX + runId,
    JSON.stringify(blueprint),
  );
}

export function loadBlueprint(runId: string): Blueprint | null {
  if (typeof window === "undefined") return null;
  if (runId === "demo-paper-airplane") return paperAirplaneBlueprint;
  const raw = window.localStorage.getItem(BLUEPRINT_PREFIX + runId);
  if (!raw) return null;
  try {
    const rawParsed = JSON.parse(raw) as Partial<Blueprint> & {
      outcomes?: Array<Partial<Blueprint["outcomes"][number]>>;
    };
    // Coerce missing isPrimary -> false (older blueprints from before the
    // schema tightened to require this field).
    if (rawParsed.outcomes) {
      rawParsed.outcomes = rawParsed.outcomes.map((o) => ({
        ...o,
        isPrimary: o.isPrimary === true,
      }));
    }
    const validated = BlueprintSchema.safeParse(rawParsed);
    if (!validated.success) {
      console.warn(
        `[run-store] stored blueprint failed schema parse (run=${runId}):`,
        validated.error.message,
      );
      return null;
    }
    return validated.data;
  } catch {
    return null;
  }
}

export function createRunId() {
  return Math.random().toString(36).slice(2, 10);
}

export { paperAirplaneBlueprint };
