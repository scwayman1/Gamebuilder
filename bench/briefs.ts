// The benchmark suite: briefs spanning grades, subjects, and mechanic
// shapes. Every prompt or template change should hold or improve the
// aggregate judge scores on this set.

import type { EngineBrief } from "../src/engine/types";

export const BENCH_BRIEFS: Array<{ id: string; brief: EngineBrief }> = [
  {
    id: "multiplication-facts",
    brief: {
      topic: "Multiplication facts 1-12",
      gradeBand: "3–5",
      subject: "Math",
      learningObjective:
        "Students recall multiplication facts quickly by choosing the correct product among distractors.",
      companionType: "Arcade Game (experimental)",
      durationMinutes: 15,
    },
  },
  {
    id: "water-cycle",
    brief: {
      topic: "The water cycle",
      gradeBand: "3–5",
      subject: "Science",
      learningObjective:
        "Students sequence evaporation, condensation, precipitation, and collection by guiding a water droplet through the cycle stages in order.",
      companionType: "Arcade Game (experimental)",
      durationMinutes: 15,
    },
  },
  {
    id: "fractions-number-line",
    brief: {
      topic: "Fractions on a number line",
      gradeBand: "6–8",
      subject: "Math",
      learningObjective:
        "Students place fractions accurately on a number line, including improper fractions and mixed numbers.",
      companionType: "Arcade Game (experimental)",
      durationMinutes: 15,
    },
  },
  {
    id: "predator-prey",
    brief: {
      topic: "Predator-prey population balance",
      gradeBand: "6–8",
      subject: "Science · Ecology",
      learningObjective:
        "Students experience how predator and prey populations constrain each other by managing an ecosystem under disturbances.",
      companionType: "Arcade Game (experimental)",
      durationMinutes: 20,
    },
  },
  {
    id: "sight-words",
    brief: {
      topic: "Kindergarten sight words",
      gradeBand: "K–2",
      subject: "Reading",
      learningObjective:
        "Students recognize common sight words instantly by catching the spoken/displayed target word among lookalikes.",
      companionType: "Arcade Game (experimental)",
      durationMinutes: 10,
    },
  },
  {
    id: "forces-motion",
    brief: {
      topic: "Forces and motion: friction and momentum",
      gradeBand: "6–8",
      subject: "Physics",
      learningObjective:
        "Students predict how friction and mass change stopping distance by steering objects across surfaces with different friction.",
      companionType: "Arcade Game (experimental)",
      durationMinutes: 20,
    },
  },
];
