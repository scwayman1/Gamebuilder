import type { Blueprint } from "./blueprint-schema";

export function downloadText(
  filename: string,
  body: string,
  type = "text/plain",
) {
  if (typeof window === "undefined") return;
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function blueprintToJson(bp: Blueprint): string {
  return JSON.stringify(bp, null, 2);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function blueprintToTeacherGuide(bp: Blueprint): string {
  const lines: string[] = [];
  lines.push(`# ${bp.moduleTitle}`);
  lines.push("");
  lines.push(
    `**Grade band:** ${bp.gradeBand} · **Subject:** ${bp.subject} · **Time:** ${bp.durationMinutes} minutes`,
  );
  lines.push("");
  lines.push(`**Template:** ${bp.template}`);
  lines.push("");
  lines.push("## Learning objectives");
  for (const o of bp.learningObjectives) lines.push(`- ${o}`);
  lines.push("");
  if (bp.standards.length > 0) {
    lines.push("## Standards");
    for (const s of bp.standards) lines.push(`- ${s}`);
    lines.push("");
  }
  lines.push("## Materials");
  for (const m of bp.materials) lines.push(`- ${m}`);
  lines.push("");
  lines.push("## Teacher prep");
  for (const p of bp.teacherPrep) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## Lesson flow");
  for (let i = 0; i < bp.scenes.length; i++) {
    const s = bp.scenes[i];
    if (!s) continue;
    lines.push(`### ${i + 1}. ${s.label}`);
    lines.push(s.goal);
    lines.push("");
  }
  lines.push("## What students will see");
  lines.push(bp.studentIntro);
  lines.push("");
  lines.push("### Variables they can tune");
  for (const v of bp.variables) {
    lines.push(
      `- **${v.label}** (${v.min}–${v.max}${v.unit ? ` ${v.unit}` : ""}, default ${v.default}): ${v.studentExplanation}`,
    );
  }
  lines.push("");
  lines.push("### Outcomes shown");
  for (const o of bp.outcomes) {
    lines.push(
      `- **${o.label}** (${o.unit})${o.isPrimary ? " — *primary*" : ""}`,
    );
  }
  lines.push("");
  lines.push("## Reflection prompts");
  for (let i = 0; i < bp.assessments.length; i++)
    lines.push(`${i + 1}. ${bp.assessments[i]}`);
  lines.push("");
  lines.push("## Vocabulary");
  for (const v of bp.vocabulary)
    lines.push(`- **${v.term}** — ${v.definition}`);
  lines.push("");
  if (bp.tips.length > 0) {
    lines.push("## Did You Know? facts");
    for (const t of bp.tips) lines.push(`- ${t}`);
    lines.push("");
  }
  if (bp.sourceAttribution.length > 0) {
    lines.push("## Sources");
    for (const s of bp.sourceAttribution) lines.push(`- ${s}`);
    lines.push("");
  }
  if (bp.risks.length > 0) {
    lines.push("## Planner risks (for content review)");
    for (const r of bp.risks) lines.push(`- ${r}`);
  }
  return lines.join("\n");
}

export function blueprintToStudentWorksheet(bp: Blueprint): string {
  const lines: string[] = [];
  lines.push(`# ${bp.moduleTitle}`);
  lines.push("");
  lines.push(bp.studentIntro);
  lines.push("");
  lines.push("## Predict");
  lines.push("Before you test, write down what you think will happen.");
  lines.push("");
  lines.push("_______________________________________________");
  lines.push("");
  lines.push("## Test");
  lines.push("Change one variable at a time and record what you see.");
  lines.push("");
  lines.push("| Variable | Setting | Result |");
  lines.push("| --- | --- | --- |");
  for (const v of bp.variables) {
    lines.push(
      `| ${v.label} | ${v.min}–${v.max}${v.unit ? ` ${v.unit}` : ""} | |`,
    );
  }
  lines.push("");
  lines.push("## Observe");
  lines.push("What changed? What stayed the same?");
  lines.push("");
  lines.push("_______________________________________________");
  lines.push("");
  lines.push("## Explain");
  for (let i = 0; i < bp.assessments.length; i++)
    lines.push(`${i + 1}. ${bp.assessments[i]}`);
  return lines.join("\n");
}
