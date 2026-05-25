"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useMemo } from "react";
import type { Blueprint } from "../blueprint-schema";
import { type CheckStatus, runQa, summarize } from "../qa-checks";

const iconFor: Record<CheckStatus, React.ReactNode> = {
  pass: <Check className="size-3.5 text-success-600" />,
  warn: <AlertTriangle className="size-3.5 text-secondary-600" />,
  fail: <X className="size-3.5 text-destructive" />,
  info: <Info className="size-3.5 text-muted-foreground" />,
};

export function QaStage({
  blueprint,
  onNext,
}: {
  blueprint: Blueprint;
  onNext: () => void;
}) {
  const groups = useMemo(() => runQa(blueprint), [blueprint]);
  const { pass, warn, fail, info } = useMemo(() => summarize(groups), [groups]);

  const ready = fail === 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Passing" value={pass} tone="pass" />
        <Summary label="Warnings" value={warn} tone="warn" />
        <Summary label="Failing" value={fail} tone="fail" />
        <Summary label="Deferred" value={info} tone="info" />
      </div>

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
              : `${fail} blocking issue${fail === 1 ? "" : "s"} — fix in the blueprint before publish`}
          </div>
          <p className="pt-0.5 text-muted-foreground text-xs">
            Warnings are recorded in the release notes. Failures must be
            resolved (Edit blueprint) before continuing.
          </p>
        </div>
        <Button onClick={onNext} disabled={!ready}>
          Continue to publish
        </Button>
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
