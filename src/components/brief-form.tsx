"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type BriefInput,
  createRunId,
  defaultBrief,
  saveBrief,
} from "./run-store";

const companionTypes = [
  "Simulation Lab",
  "Build-and-Test Activity",
  "Scenario Challenge",
  "Decision Game",
  "Sorting/Matching Lab",
  "Micro-Experiment Companion",
];

const accessibilityOptions = [
  "Keyboard nav",
  "Screen reader labels",
  "High-contrast",
  "Reduced motion",
  "Captions for any audio",
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is rendered as children
    <label className="block space-y-1.5">
      <span className="block font-medium text-foreground text-xs">{label}</span>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </label>
  );
}

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const textareaCls =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function BriefForm() {
  const router = useRouter();
  const [brief, setBrief] = useState<BriefInput>(defaultBrief);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof BriefInput>(k: K, v: BriefInput[K]) =>
    setBrief((b) => ({ ...b, [k]: v }));

  const toggleA11y = (opt: string) =>
    update(
      "accessibility",
      brief.accessibility.includes(opt)
        ? brief.accessibility.filter((o) => o !== opt)
        : [...brief.accessibility, opt],
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const id = createRunId();
    saveBrief(id, brief);
    router.push(`/run/${id}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="border-primary-100/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lesson target</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Topic or unit name">
            <input
              required
              value={brief.topic}
              onChange={(e) => update("topic", e.target.value)}
              placeholder="e.g. Throwing a football, Ecosystem balance, Levers"
              className={inputCls}
            />
          </Field>
          <Field label="Grade band">
            <select
              value={brief.gradeBand}
              onChange={(e) => update("gradeBand", e.target.value)}
              className={inputCls}
            >
              {["K–2", "3–5", "6–8", "9–12"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <input
              value={brief.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="e.g. STEM · Physical Science"
              className={inputCls}
            />
          </Field>
          <Field label="Time available (minutes)">
            <input
              type="number"
              min={5}
              max={120}
              value={brief.durationMinutes}
              onChange={(e) =>
                update("durationMinutes", Number(e.target.value))
              }
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              label="Learning objective"
              hint="One sentence. What should a student be able to do after?"
            >
              <textarea
                required
                value={brief.learningObjective}
                onChange={(e) => update("learningObjective", e.target.value)}
                placeholder="e.g. Students learn how predator and prey populations balance each other, and how disturbances shift that balance."
                className={textareaCls}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary-100/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Companion shape</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Companion type">
            <select
              value={brief.companionType}
              onChange={(e) => update("companionType", e.target.value)}
              className={inputCls}
            >
              {companionTypes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Tone & voice">
            <input
              value={brief.tone}
              onChange={(e) => update("tone", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              label="Source material / existing lesson"
              hint="Paste a summary, link, or unit description."
            >
              <textarea
                value={brief.sourceMaterial}
                onChange={(e) => update("sourceMaterial", e.target.value)}
                className={textareaCls}
              />
            </Field>
          </div>
          <Field label="Required standards">
            <input
              value={brief.standards}
              onChange={(e) => update("standards", e.target.value)}
              className={inputCls}
              placeholder="NGSS, CCSS, …"
            />
          </Field>
          <Field label="Classroom constraints">
            <input
              value={brief.classroomConstraints}
              onChange={(e) => update("classroomConstraints", e.target.value)}
              className={inputCls}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-primary-100/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quality bar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Accessibility requirements">
            <div className="flex flex-wrap gap-2 pt-1">
              {accessibilityOptions.map((opt) => {
                const on = brief.accessibility.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleA11y(opt)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on
                        ? "border-primary-300 bg-primary-50 text-primary-700"
                        : "border-input text-muted-foreground hover:border-primary-200",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field
            label="Similar modules to imitate"
            hint="Optional. Reference any prior AB Studios companion."
          >
            <input
              value={brief.similarModules}
              onChange={(e) => update("similarModules", e.target.value)}
              className={inputCls}
              placeholder="e.g. Paper Airplane Simulator"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="mr-auto text-muted-foreground text-xs">
          Submitting drafts a blueprint for human review before any build runs.
        </p>
        <Button type="submit" size="lg" isLoading={submitting}>
          Draft blueprint
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}
