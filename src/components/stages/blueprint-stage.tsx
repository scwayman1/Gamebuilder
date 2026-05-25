"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type Blueprint,
  type BlueprintOutcome,
  type BlueprintVariable,
  validateBlueprint,
} from "../blueprint-schema";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      <div className="text-foreground/85 text-sm">{children}</div>
    </div>
  );
}

const inputCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const textareaCls =
  "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function BlueprintStage({
  blueprint,
  onApprove,
  onUpdate,
}: {
  blueprint: Blueprint;
  onApprove: () => void;
  onUpdate?: (next: Blueprint) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Blueprint>(blueprint);
  const issues = useMemo(() => validateBlueprint(blueprint), [blueprint]);

  const startEdit = () => {
    setDraft(blueprint);
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = () => {
    onUpdate?.(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <BlueprintEditor
        draft={draft}
        onChange={setDraft}
        onCancel={cancelEdit}
        onSave={saveEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {issues.length > 0 ? (
        <div className="flex gap-3 rounded-lg border border-secondary-200 bg-secondary-50/50 p-4">
          <AlertTriangle className="size-4 shrink-0 text-secondary-600" />
          <div className="space-y-1 text-sm">
            <div className="font-medium">
              {issues.length} validation issue{issues.length === 1 ? "" : "s"}
            </div>
            <ul className="list-disc space-y-0.5 pl-4 text-foreground/80 text-xs">
              {issues.map((i) => (
                <li key={i.path + i.problem}>
                  <code className="text-[11px]">{i.path}</code> — {i.problem}
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[11px] text-muted-foreground">
              Click Edit to fix, or Approve anyway and the simulator will mark
              affected outcomes as not-a-number.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="border-primary-100/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div className="space-y-1.5">
            <CardTitle className="text-lg">{blueprint.moduleTitle}</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="border-primary-200">
                {blueprint.template}
              </Badge>
              <Badge variant="outline">{blueprint.gradeBand}</Badge>
              <Badge variant="outline">{blueprint.subject}</Badge>
              <Badge variant="outline">{blueprint.durationMinutes} min</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <Section title="Student intro">{blueprint.studentIntro}</Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Learning objectives">
              <ul className="list-disc space-y-1 pl-4">
                {blueprint.learningObjectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </Section>
            <Section title="Standards">
              <ul className="space-y-1">
                {blueprint.standards.map((s) => (
                  <li key={s} className="text-muted-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Scenes">
              <ul className="space-y-2">
                {blueprint.scenes.map((s) => (
                  <li key={s.id} className="rounded-md border bg-muted/30 p-2">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-muted-foreground text-xs">
                      {s.goal}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Variables">
              <ul className="space-y-2">
                {blueprint.variables.map((v) => (
                  <li key={v.id} className="rounded-md border bg-muted/30 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {v.min}–{v.max}
                        {v.unit ? ` ${v.unit}` : ""}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {v.studentExplanation}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Outcomes (formulas)">
            <ul className="space-y-2">
              {blueprint.outcomes.map((o) => (
                <li key={o.id} className="rounded-md border bg-muted/30 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {o.label}{" "}
                      {o.isPrimary ? (
                        <span className="ml-1 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700">
                          primary
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {o.unit}
                    </span>
                  </div>
                  <code className="block pt-1 text-[11px] text-muted-foreground">
                    {o.formula}
                  </code>
                </li>
              ))}
            </ul>
          </Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section title="Teacher prep">
              <ul className="list-disc space-y-1 pl-4">
                {blueprint.teacherPrep.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Section>
            <Section title="Materials">
              <ul className="list-disc space-y-1 pl-4">
                {blueprint.materials.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Section>
          </div>

          {blueprint.risks.length > 0 ? (
            <Section title="Risks identified by planner">
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {blueprint.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-primary-100 bg-primary-50/40 p-4">
        <div className="text-sm">
          <div className="font-medium">Approve to begin parallel build</div>
          <p className="pt-0.5 text-muted-foreground text-xs">
            No code or assets are generated until you approve.
          </p>
        </div>
        <Button onClick={onApprove}>
          <Check className="size-4" />
          Approve blueprint
        </Button>
      </div>
    </div>
  );
}

function BlueprintEditor({
  draft,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Blueprint;
  onChange: (next: Blueprint) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const issues = useMemo(() => validateBlueprint(draft), [draft]);

  const set = <K extends keyof Blueprint>(k: K, v: Blueprint[K]) =>
    onChange({ ...draft, [k]: v });

  const updateVariable = (i: number, patch: Partial<BlueprintVariable>) => {
    const next = draft.variables.slice();
    const existing = next[i];
    if (!existing) return;
    next[i] = { ...existing, ...patch };
    set("variables", next);
  };
  const removeVariable = (i: number) =>
    set(
      "variables",
      draft.variables.filter((_, j) => j !== i),
    );
  const addVariable = () =>
    set("variables", [
      ...draft.variables,
      {
        id: `var${draft.variables.length + 1}`,
        label: "New variable",
        min: 0,
        max: 100,
        default: 50,
        unit: "",
        studentExplanation: "",
      },
    ]);

  const updateOutcome = (i: number, patch: Partial<BlueprintOutcome>) => {
    let next = draft.outcomes.slice();
    const existing = next[i];
    if (!existing) return;
    next[i] = { ...existing, ...patch };
    if (patch.isPrimary === true) {
      next = next.map((o, j) => (j === i ? o : { ...o, isPrimary: false }));
    }
    set("outcomes", next);
  };
  const removeOutcome = (i: number) =>
    set(
      "outcomes",
      draft.outcomes.filter((_, j) => j !== i),
    );
  const addOutcome = () =>
    set("outcomes", [
      ...draft.outcomes,
      {
        id: `outcome${draft.outcomes.length + 1}`,
        label: "New outcome",
        unit: "",
        formula: "0",
        isPrimary: draft.outcomes.length === 0,
      },
    ]);

  return (
    <div className="space-y-5">
      <Card className="border-primary-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Editing blueprint</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={issues.length > 0}
              tooltip={
                issues.length > 0
                  ? "Fix validation issues before saving"
                  : undefined
              }
            >
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Module title</Label>
            <input
              className={inputCls}
              value={draft.moduleTitle}
              onChange={(e) => set("moduleTitle", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Student intro</Label>
            <textarea
              className={textareaCls}
              value={draft.studentIntro}
              onChange={(e) => set("studentIntro", e.target.value)}
            />
          </div>
          <ListEditor
            label="Learning objectives"
            items={draft.learningObjectives}
            placeholder="A new objective"
            onChange={(items) => set("learningObjectives", items)}
          />
          <ListEditor
            label="Tips (Did You Know?)"
            items={draft.tips}
            placeholder="A new fact"
            onChange={(items) => set("tips", items)}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Variables</Label>
              <Button variant="outline" size="sm" onClick={addVariable}>
                <Plus className="size-3.5" />
                Add variable
              </Button>
            </div>
            <div className="space-y-2">
              {draft.variables.map((v, i) => (
                <VariableRow
                  key={v.id}
                  variable={v}
                  onChange={(p) => updateVariable(i, p)}
                  onRemove={() => removeVariable(i)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Outcomes</Label>
              <Button variant="outline" size="sm" onClick={addOutcome}>
                <Plus className="size-3.5" />
                Add outcome
              </Button>
            </div>
            <div className="space-y-2">
              {draft.outcomes.map((o, i) => (
                <OutcomeRow
                  key={o.id}
                  outcome={o}
                  onChange={(p) => updateOutcome(i, p)}
                  onRemove={() => removeOutcome(i)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {issues.length > 0 ? (
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-error-background p-4">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <div className="font-medium text-error-800">
              {issues.length} validation issue{issues.length === 1 ? "" : "s"}
            </div>
            <ul className="list-disc space-y-0.5 pl-4 text-foreground/80 text-xs">
              {issues.map((i) => (
                <li key={i.path + i.problem}>
                  <code className="text-[11px]">{i.path}</code> — {i.problem}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Label(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("font-medium text-foreground text-xs", props.className)}
    />
  );
}

function ListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const update = (i: number, v: string) => {
    const next = items.slice();
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={`${label}-${i}-${item.slice(0, 8)}`}
            className="flex items-start gap-2"
          >
            <textarea
              className={cn(textareaCls, "min-h-[40px]")}
              value={item}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              tooltip="Remove"
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VariableRow({
  variable,
  onChange,
  onRemove,
}: {
  variable: BlueprintVariable;
  onChange: (patch: Partial<BlueprintVariable>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_0.7fr_auto]">
        <input
          className={inputCls}
          value={variable.label}
          placeholder="Label"
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <input
          type="number"
          className={inputCls}
          value={variable.min}
          placeholder="min"
          onChange={(e) => onChange({ min: Number(e.target.value) })}
        />
        <input
          type="number"
          className={inputCls}
          value={variable.max}
          placeholder="max"
          onChange={(e) => onChange({ max: Number(e.target.value) })}
        />
        <input
          type="number"
          className={inputCls}
          value={variable.default}
          placeholder="default"
          onChange={(e) => onChange({ default: Number(e.target.value) })}
        />
        <input
          className={inputCls}
          value={variable.unit ?? ""}
          placeholder="unit"
          onChange={(e) => onChange({ unit: e.target.value || undefined })}
        />
        <Button variant="ghost" size="icon" onClick={onRemove} tooltip="Remove">
          <X className="size-3.5" />
        </Button>
      </div>
      <input
        className={cn(inputCls, "mt-2")}
        value={variable.studentExplanation}
        placeholder="What this slider does, in kid-friendly language"
        onChange={(e) => onChange({ studentExplanation: e.target.value })}
      />
      <div className="pt-1 text-[10px] text-muted-foreground">
        id <code>{variable.id}</code>
      </div>
    </div>
  );
}

function OutcomeRow({
  outcome,
  onChange,
  onRemove,
}: {
  outcome: BlueprintOutcome;
  onChange: (patch: Partial<BlueprintOutcome>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_auto_auto]">
        <input
          className={inputCls}
          value={outcome.label}
          placeholder="Label"
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <input
          className={inputCls}
          value={outcome.unit}
          placeholder="unit"
          onChange={(e) => onChange({ unit: e.target.value })}
        />
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={outcome.isPrimary ?? false}
            onChange={(e) => onChange({ isPrimary: e.target.checked })}
          />
          Primary
        </label>
        <Button variant="ghost" size="icon" onClick={onRemove} tooltip="Remove">
          <X className="size-3.5" />
        </Button>
      </div>
      <textarea
        className={cn(textareaCls, "mt-2 font-mono text-xs")}
        value={outcome.formula}
        placeholder="JS expression using variable ids and Math.*"
        onChange={(e) => onChange({ formula: e.target.value })}
      />
      <div className="pt-1 text-[10px] text-muted-foreground">
        id <code>{outcome.id}</code>
      </div>
    </div>
  );
}
