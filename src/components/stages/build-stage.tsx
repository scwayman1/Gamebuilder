"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type Blueprint,
  evalFormula,
  inferVisualizationKind,
  validateBlueprint,
} from "../blueprint-schema";

type TaskStatus = "queued" | "running" | "pass" | "warn" | "fail";
type TaskResult = {
  status: Exclude<TaskStatus, "queued" | "running">;
  detail: string;
};
type TaskDef = {
  id: string;
  agent: string;
  label: string;
  run: (bp: Blueprint) => TaskResult;
};

type TaskState = {
  status: TaskStatus;
  detail: string;
};

const tasks: TaskDef[] = [
  {
    id: "designer",
    agent: "Learning Designer",
    label: "Mapping objectives to scenes",
    run: (bp) => {
      const haystack = [
        ...bp.scenes.map((s) => `${s.label} ${s.goal}`),
        ...bp.assessments,
        ...bp.tips,
        bp.studentIntro,
      ]
        .join(" ")
        .toLowerCase();
      const missed = bp.learningObjectives.filter((o) => {
        const kw = (o.toLowerCase().match(/[a-z]{4,}/g) ?? []).slice(0, 4);
        return !kw.some((k) => haystack.includes(k));
      });
      if (missed.length === 0)
        return {
          status: "pass",
          detail: `${bp.learningObjectives.length}/${bp.learningObjectives.length} objectives reinforced in scenes & prompts`,
        };
      return {
        status: missed.length === 1 ? "warn" : "fail",
        detail: `${missed.length} objective(s) not echoed downstream`,
      };
    },
  },
  {
    id: "mechanic",
    agent: "Game/Interaction Designer",
    label: "Calibrating sliders & outcome formulas",
    run: (bp) => {
      const issues = validateBlueprint(bp).filter((i) =>
        i.path.startsWith("outcomes."),
      );
      if (issues.length === 0)
        return {
          status: "pass",
          detail: `${bp.outcomes.length} outcomes evaluated cleanly across ${bp.variables.length}-variable sample grid`,
        };
      return {
        status: "fail",
        detail: `${issues.length} formula issue(s): ${issues[0]?.problem ?? ""}`,
      };
    },
  },
  {
    id: "writer",
    agent: "Content Writer",
    label: "Drafting student & teacher copy",
    run: (bp) => {
      const intro = bp.studentIntro;
      const words = intro.trim().split(/\s+/).filter(Boolean).length;
      const sentences = intro.split(/[.!?]+/).filter((s) => s.trim()).length;
      const tips = bp.tips.length;
      const assessments = bp.assessments.length;
      if (words === 0)
        return { status: "fail", detail: "Student intro is empty" };
      const status: TaskResult["status"] = words > 50 ? "warn" : "pass";
      return {
        status,
        detail: `Intro ${words}w / ${sentences} sentence(s); ${tips} tips; ${assessments} reflection prompts`,
      };
    },
  },
  {
    id: "visual",
    agent: "Visual/Asset Planner",
    label: "Selecting visual primitives",
    run: (bp) => {
      const primary = bp.outcomes.find((o) => o.isPrimary);
      // Use the same picker SimulationLab uses so the displayed name
      // matches what the user actually sees on the Preview stage.
      const kind = inferVisualizationKind(bp);
      const detail = bp.visualizationKind
        ? `Planner set visualizationKind="${kind}"; primary outcome ${primary?.label ?? "—"} (${primary?.unit ?? ""})`
        : `Inferred visualizationKind="${kind}" from primary outcome ${primary?.label ?? "—"} (${primary?.unit ?? ""})`;
      return { status: "pass", detail };
    },
  },
  {
    id: "frontend",
    agent: "Frontend Builder",
    label: "Composing the interactive into the template",
    run: (bp) => {
      const defaults: Record<string, number> = {};
      for (const v of bp.variables) defaults[v.id] = v.default;
      const renderable = bp.outcomes.every((o) =>
        Number.isFinite(evalFormula(o.formula, defaults)),
      );
      return renderable
        ? {
            status: "pass",
            detail: `Wired ${bp.variables.length} sliders → ${bp.outcomes.length} outcomes; all render at defaults`,
          }
        : {
            status: "fail",
            detail:
              "Some outcomes are not finite at defaults — visualization will show NaN",
          };
    },
  },
  {
    id: "qa",
    agent: "QA Reviewer",
    label: "Running automated heuristic checks",
    run: (bp) => {
      const issues = validateBlueprint(bp);
      if (issues.length === 0)
        return {
          status: "pass",
          detail: "No structural issues; awaiting full QA stage",
        };
      const fails = issues.length;
      return {
        status: fails > 2 ? "fail" : "warn",
        detail: `${fails} validation issue(s) — see QA stage for details`,
      };
    },
  },
];

const statusIcon: Record<TaskStatus, React.ReactNode> = {
  queued: <span className="size-4 rounded-full border" />,
  running: <Loader2 className="size-4 animate-spin text-primary-500" />,
  pass: <Check className="size-4 text-success-600" />,
  warn: <AlertTriangle className="size-4 text-secondary-600" />,
  fail: <X className="size-4 text-destructive" />,
};

export function BuildStage({
  blueprint,
  onDone,
}: {
  blueprint: Blueprint;
  onDone: () => void;
}) {
  const [state, setState] = useState<Record<string, TaskState>>(() =>
    Object.fromEntries(
      tasks.map((t) => [t.id, { status: "queued" as TaskStatus, detail: "" }]),
    ),
  );

  useEffect(() => {
    // Reset on every blueprint change.
    setState(
      Object.fromEntries(
        tasks.map((t) => [
          t.id,
          { status: "queued" as TaskStatus, detail: "" },
        ]),
      ),
    );
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    tasks.forEach((task, i) => {
      const startAt = 200 + i * 350;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setState((s) => ({
            ...s,
            [task.id]: { status: "running", detail: task.label },
          }));
        }, startAt),
      );
      timers.push(
        setTimeout(
          () => {
            if (cancelled) return;
            const result = task.run(blueprint);
            setState((s) => ({
              ...s,
              [task.id]: { status: result.status, detail: result.detail },
            }));
          },
          startAt + 600 + (i % 3) * 120,
        ),
      );
    });
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [blueprint]);

  const allDone = tasks.every((t) => {
    const s = state[t.id]?.status;
    return s === "pass" || s === "warn" || s === "fail";
  });
  const blockingFail = tasks.some((t) => state[t.id]?.status === "fail");

  return (
    <div className="space-y-5">
      <Card className="border-primary-100/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            Agents working in parallel
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Orchestrator coordinating {tasks.length} specialists against the
            live blueprint
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.map((t) => {
            const s = state[t.id] ?? {
              status: "queued" as TaskStatus,
              detail: "",
            };
            return (
              <div
                key={t.id}
                className="rounded-lg border bg-background/50 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">{statusIcon[s.status]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{t.agent}</span>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider",
                          s.status === "pass" && "text-success-600",
                          s.status === "warn" && "text-secondary-600",
                          s.status === "fail" && "text-destructive",
                          (s.status === "queued" || s.status === "running") &&
                            "text-muted-foreground",
                        )}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="pt-0.5 text-muted-foreground text-xs">
                      {s.status === "queued"
                        ? "Queued"
                        : s.status === "running"
                          ? t.label
                          : s.detail}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="mr-auto text-muted-foreground text-xs">
          {!allDone
            ? "Tasks evaluating the current blueprint…"
            : blockingFail
              ? "One or more tasks reported a blocking issue. Fix in the blueprint editor and re-run."
              : "All workstreams reported success. Preview is ready."}
        </p>
        <Button disabled={!allDone || blockingFail} onClick={onDone}>
          Open preview
        </Button>
      </div>
    </div>
  );
}
