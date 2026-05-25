import type { Blueprint } from "./blueprint-schema";

export type { Blueprint } from "./blueprint-schema";

export const paperAirplaneBlueprint: Blueprint = {
  moduleTitle: "Paper Airplane Simulator",
  template: "Build-and-Test Activity + Simulation Lab",
  gradeBand: "3–5",
  subject: "STEM · Physical Science",
  durationMinutes: 20,
  learningObjectives: [
    "Identify the four forces of flight: thrust, drag, lift, and gravity.",
    "Predict how design changes (wing angle, nose weight) affect flight.",
    "Use evidence from trials to explain which design flew farthest and why.",
  ],
  standards: [
    "NGSS 3-PS2-1 — Forces and motion",
    "NGSS 3-5-ETS1-3 — Test variables, compare results",
  ],
  studentIntro:
    "You're an aerospace engineer running a wind-tunnel lab. Fold a plane, test it, change one variable at a time, and find the design that flies farthest.",
  teacherPrep: [
    "Print fold templates (1 per student, 6 designs available).",
    "Clear a 6-meter runway in the classroom for flight tests.",
    "Pre-open the simulator on the classroom display.",
  ],
  materials: ["Letter paper", "Paperclips (nose weight)", "Measuring tape"],
  scenes: [
    {
      id: "fold",
      label: "How to Fold",
      goal: "Students fold a chosen design using guided step images.",
    },
    {
      id: "sim",
      label: "Flight Sim",
      goal: "Students adjust variables and observe distance & hang time.",
    },
    {
      id: "tunnel",
      label: "Wind Tunnel",
      goal: "Visualize lift vs. drag at different wing angles.",
    },
  ],
  variables: [
    {
      id: "throwPower",
      label: "Throw power",
      min: 0,
      max: 100,
      default: 60,
      unit: "%",
      studentExplanation: "How hard you launch — more thrust.",
    },
    {
      id: "wingAngle",
      label: "Wing angle",
      min: 0,
      max: 40,
      default: 12,
      unit: "°",
      studentExplanation: "Angle of attack — too high stalls, too low dives.",
    },
    {
      id: "noseWeight",
      label: "Nose weight",
      min: 0,
      max: 100,
      default: 25,
      unit: "%",
      studentExplanation: "Paperclips on the nose shift center of gravity.",
    },
    {
      id: "wind",
      label: "Wind speed",
      min: -30,
      max: 30,
      default: 0,
      studentExplanation: "Headwind slows it, tailwind helps.",
    },
  ],
  outcomes: [
    {
      id: "distance",
      label: "Distance",
      unit: "m",
      formula:
        "Math.max(0, (throwPower/60)*10 + Math.sin(wingAngle*Math.PI/180*1.6)*6 - (0.5*(0.4+Math.pow(wingAngle/40,1.5)))*4 + (wind/30)*2) * (1 - (noseWeight/100)*0.35)",
      isPrimary: true,
    },
    {
      id: "hangTime",
      label: "Hang time",
      unit: "s",
      formula:
        "Math.max(0.2, (Math.sin(wingAngle*Math.PI/180*1.6)*3 + 0.6 - (noseWeight/100)*1.2) * (0.7 + (throwPower/60)*0.3))",
      isPrimary: false,
    },
    {
      id: "stability",
      label: "Stability",
      unit: "%",
      formula:
        "Math.max(0, Math.min(100, (0.7 + ((noseWeight/100)-0.25)*0.6 - Math.abs(wingAngle-12)/40)*100))",
      isPrimary: false,
    },
  ],
  tips: [
    "Lift comes from air moving faster over the top of the wing than under it.",
    "Too much nose weight makes the plane dive — center of gravity matters.",
    "A higher wing angle adds lift, but past ~20° most paper designs stall.",
    "Drag grows quickly with speed — a sleek nose pays off most at high throws.",
    "A tailwind effectively adds thrust; a headwind subtracts from it.",
  ],
  assessments: [
    "Which variable had the biggest effect on distance, and why?",
    "Draw arrows for thrust, drag, lift, and gravity on a flying plane.",
    "If you added one more paperclip, predict what happens. Test and explain.",
    "Compare two designs — when would you pick each?",
    "Reflection: what surprised you about your best design?",
  ],
  vocabulary: [
    { term: "Thrust", definition: "The push that moves the plane forward." },
    { term: "Drag", definition: "Air resistance that slows the plane down." },
    { term: "Lift", definition: "Upward force from air moving over the wing." },
    {
      term: "Center of gravity",
      definition: "The balance point of the plane.",
    },
  ],
  risks: [
    "Students may chase distance without engaging the 'why' — prompt teachers to require one-variable-at-a-time trials.",
    "Tablet drag latency on older devices; throttle slider updates.",
  ],
  sourceAttribution: [
    "NASA Glenn — Beginner's Guide to Aeronautics.",
    "AB Studios brand voice pack v1.2.",
  ],
};
