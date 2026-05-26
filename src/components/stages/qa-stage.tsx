"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Review } from "@/engine/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Info, Sparkles, X } from "lucide-react";
import { useMemo } from "react";
import type { Blueprint } from "../blueprint-schema";
import { type CheckStatus, runQa, summarize } from "../qa-checks";

const iconFor: Record<CheckStatus, React.ReactNode> = {
  pass: <Check className="size-3.5 text-success-600" />,
  warn: <AlertTriangle className="size-3.5 text-secondary-600" />,
  fail: <X className="size-3.5 text-destructive" />,
  info: <Info className="size-3.5 text-muted-foreground" />,
};

const severityIcon = {
  nit: <Info className="size-3.5 text-muted-foreground" />,
  issue: <AlertTriangle className="size-3.5 text-secondary-600" />,
  blocker: <X className="size-3.5 text-destructive" />,
};

export function QaStage({
  blueprint,
  review,
  onNext,
}: {
  blueprint: Blueprint;
  review?: Review | null;
  onNext: () => void;
}) {
  const groups = useMemo(() => runQa(blueprint), [blueprint]);
  const { pass, warn, fail, info } = useMemo(() => summarize(groups), [groups]);

  const blockerCount =
    review?.critiques.filter((c) => c.severity === "blocker").length ?? 0;
  const ready = fail === 0 && blockerCount === 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Passing" value={pass} tone="pass" />
        <Summary label="Warnings" value={warn} tone="warn" />
        <Summary label="Failing" value={fail} tone="fail" />
        <Summary label="Deferred" value={info} tone="info" />
      </div>

      {review ? <ReviewerCard review={review} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title} className="border-primary-100/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{g.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {g.checks.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border bg-background/50 p-2.5"
                >
                  <div className="flex items-center gap-2 text-sm">
                    {iconFor[c.status]}
                    <span className="font-medium">{c.label}</span>
                  </div>
                  <div className="pt-0.5 pl-5 text-muted-foreground text-xs">
                    {c.detail}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div
        className={cn(
          "flex items-center justify-between rounded-lg border p-4",
          ready
            ? "border-primary-100 bg-primary-50/40"
            : "border-destructive/30 bg-error-background",
        )}
      >
        <div className="text-sm">
          <div className="font-medium">
            {ready
              ? `QA passed with ${warn} warning${warn === 1 ? "" : "s"}`
              : blockerCount > 0
                ? `Reviewer flagged ${blockerCount} blocker${blockerCount === 1 ? "" : "s"}; fix in the blueprint before publish`
                : `${fail} blocking issue${fail === 1 ? "" : "s"} — fix in the blueprint before publish`}
          </div>
          <p className="pt-0.5 text-muted-foreground text-xs">
            Warnings are recorded in the release notes. Failures and reviewer
            blockers must be resolved (Edit blueprint) before continuing.
          </p>
        </div>
        <Button onClick={onNext} disabled={!ready}>
          Continue to publish
        </Button>
      </div>
    </div>
  );
}

function ReviewerCard({ review }: { review: Review }) {
  const verdictTone: Record<Review["verdict"], string> = {
    approve: "text-success-600 border-success-600/30 bg-success-background",
    revise: "text-secondary-700 border-secondary-200 bg-secondary-50/50",
    reject: "text-error-800 border-destructive/30 bg-error-background",
  };
  const scores = review.scores;
  return (
    <Card className="border-primary-100/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary-500" />
          Agent Reviewer
        </CardTitle>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide",
            verdictTone[review.verdict],
          )}
        >
          verdict: {review.verdict}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-foreground/85 text-sm italic">"{review.summary}"</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ScorePill label="Pedagogy" value={scores.pedagogy} />
          <ScorePill label="Mechanic" value={scores.mechanic} />
          <ScorePill label="Copy" value={scores.copy} />
          <ScorePill label="Classroom fit" value={scores.classroomFit} />
        </div>
        {review.critiques.length > 0 ? (
          <div className="space-y-1.5">
            <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Critiques
            </div>
            <ul className="space-y-1.5">
              {review.critiques.map((c, i) => (
                <li
                  key={`${c.stage}-${i}`}
                  className="rounded-md border bg-background/50 p-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {severityIcon[c.severity]}
                    <span className="font-medium">
                      <code className="text-[11px] text-muted-foreground">
                        {c.stage}
                      </code>{" "}
                      · {c.problem}
                    </span>
                  </div>
                  <div className="pt-1 pl-5 text-muted-foreground text-xs">
                    Suggestion: {c.suggestion}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 8
      ? "border-success-600/30 bg-success-background text-success-600"
      : value >= 6
        ? "border-primary-100 bg-primary-50/40 text-primary-700"
        : value >= 4
          ? "border-secondary-200 bg-secondary-50/50 text-secondary-700"
          : "border-destructive/30 bg-error-background text-error-800";
  return (
    <div className={cn("rounded-md border px-2 py-1.5", tone)}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-base tabular-nums">
        {value.toFixed(1)}
        <span className="text-muted-foreground text-xs"> / 10</span>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pass" | "warn" | "fail" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "pass" && "border-success-600/30 bg-success-background",
        tone === "warn" && "border-secondary-200 bg-secondary-50/50",
        tone === "fail" && "border-error-800/30 bg-error-background",
        tone === "info" && "border-muted bg-muted/30",
      )}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-2xl">{value}</div>
    </div>
  );
}
