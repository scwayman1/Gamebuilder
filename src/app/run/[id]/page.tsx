"use client";

import type { Blueprint } from "@/components/blueprint-schema";
import {
  type BriefInput,
  defaultBrief,
  loadBlueprint,
  loadBrief,
  saveBlueprint,
} from "@/components/run-store";
import { BlueprintStage } from "@/components/stages/blueprint-stage";
import { BuildStage } from "@/components/stages/build-stage";
import { PreviewStage } from "@/components/stages/preview-stage";
import { PublishStage } from "@/components/stages/publish-stage";
import { QaStage } from "@/components/stages/qa-stage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngineMeta } from "@/engine/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Loader2,
  PlayCircle,
  Rocket,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const stages = [
  { id: "blueprint", label: "Blueprint", icon: Wand2 },
  { id: "build", label: "Build", icon: Boxes },
  { id: "preview", label: "Preview", icon: PlayCircle },
  { id: "qa", label: "QA", icon: ClipboardCheck },
  { id: "publish", label: "Publish", icon: Rocket },
] as const;

type StageId = (typeof stages)[number]["id"];

export default function RunPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const [brief, setBrief] = useState<BriefInput>(defaultBrief);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [genMeta, setGenMeta] = useState<EngineMeta | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [stage, setStage] = useState<StageId>("blueprint");
  const [completed, setCompleted] = useState<Set<StageId>>(new Set());
  const generationStarted = useRef(false);

  useEffect(() => {
    const b = loadBrief(runId);
    if (b) setBrief(b);
    const existing = loadBlueprint(runId);
    if (existing) {
      setBlueprint(existing);
      return;
    }
    if (!b || generationStarted.current) return;
    generationStarted.current = true;
    void generateBlueprint(b)
      .then(({ blueprint: bp, meta }) => {
        setBlueprint(bp);
        setGenMeta(meta);
        saveBlueprint(runId, bp);
      })
      .catch((e: unknown) => {
        if (e instanceof GenerationError) {
          setGenError(e.message);
          if (e.meta) setGenMeta(e.meta);
        } else {
          setGenError(e instanceof Error ? e.message : "Generation failed");
        }
      });
  }, [runId]);

  const advance = (to: StageId, from: StageId) => {
    setCompleted((c) => {
      const next = new Set(c);
      next.add(from);
      return next;
    });
    setStage(to);
  };

  const retry = () => {
    setGenError(null);
    generationStarted.current = false;
    setBlueprint(null);
    setGenMeta(null);
    void generateBlueprint(brief)
      .then(({ blueprint: bp, meta }) => {
        setBlueprint(bp);
        setGenMeta(meta);
        saveBlueprint(runId, bp);
      })
      .catch((e: unknown) => {
        if (e instanceof GenerationError) {
          setGenError(e.message);
          if (e.meta) setGenMeta(e.meta);
        } else {
          setGenError(e instanceof Error ? e.message : "Generation failed");
        }
      });
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            Back
          </Link>
          <h1 className="pt-1 font-semibold text-2xl tracking-tight">
            {brief.topic || "Module run"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Run <code className="text-xs">{runId}</code> · {brief.gradeBand} ·{" "}
            {brief.durationMinutes} min
            {genMeta ? (
              <span className="ml-1">
                · generated in {(genMeta.totalLatencyMs / 1000).toFixed(1)}s
                across {genMeta.stages.length} stage runs
                {genMeta.revisionCount > 0
                  ? `, ${genMeta.revisionCount} revision pass${
                      genMeta.revisionCount === 1 ? "" : "es"
                    }`
                  : ""}
                {genMeta.review ? ` · reviewer ${genMeta.review.verdict}` : ""}
              </span>
            ) : null}
          </p>
        </div>
        <Stepper
          current={stage}
          completed={completed}
          onSelect={(s) => {
            if (completed.has(s) || s === stage) setStage(s);
          }}
        />
      </div>

      {genMeta && genMeta.stages.length > 0 ? (
        <StageTimeline meta={genMeta} defaultOpen={!!genError} />
      ) : null}

      {!blueprint && !genError ? (
        <GeneratingState topic={brief.topic} />
      ) : genError ? (
        <ErrorState message={genError} onRetry={retry} />
      ) : blueprint ? (
        <div>
          {stage === "blueprint" ? (
            <BlueprintStage
              blueprint={blueprint}
              onApprove={() => advance("build", "blueprint")}
              onUpdate={(next) => {
                setBlueprint(next);
                saveBlueprint(runId, next);
              }}
            />
          ) : stage === "build" ? (
            <BuildStage
              blueprint={blueprint}
              onDone={() => advance("preview", "build")}
            />
          ) : stage === "preview" ? (
            <PreviewStage
              blueprint={blueprint}
              onNext={() => advance("qa", "preview")}
            />
          ) : stage === "qa" ? (
            <QaStage
              blueprint={blueprint}
              onNext={() => advance("publish", "qa")}
            />
          ) : (
            <PublishStage blueprint={blueprint} />
          )}
        </div>
      ) : null}
    </div>
  );
}

const EMPTY_META: EngineMeta = {
  totalLatencyMs: 0,
  stages: [],
  revisionCount: 0,
  review: null,
  residualIssues: [],
  keyFingerprint: "",
};

class GenerationError extends Error {
  constructor(
    message: string,
    public meta: EngineMeta | null,
    public keyFingerprint?: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

async function generateBlueprint(
  brief: BriefInput,
): Promise<{ blueprint: Blueprint; meta: EngineMeta }> {
  const res = await fetch("/api/blueprint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      keyFingerprint?: string;
      meta?: EngineMeta;
    };
    throw new GenerationError(
      body.error ?? `Server error: ${res.status}`,
      body.meta ?? null,
      body.keyFingerprint,
    );
  }
  const data = (await res.json()) as {
    blueprint: Blueprint;
    meta?: EngineMeta;
  };
  return {
    blueprint: data.blueprint,
    meta: data.meta ?? EMPTY_META,
  };
}

function Stepper({
  current,
  completed,
  onSelect,
}: {
  current: StageId;
  completed: Set<StageId>;
  onSelect: (s: StageId) => void;
}) {
  return (
    <ol className="flex items-center gap-1 rounded-lg border bg-background p-1">
      {stages.map((s) => {
        const isCurrent = current === s.id;
        const isDone = completed.has(s.id);
        const reachable = isCurrent || isDone;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              disabled={!reachable}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-xs transition-colors",
                isCurrent && "bg-primary-50 text-primary-700",
                !isCurrent && isDone && "text-foreground hover:bg-muted",
                !reachable && "cursor-not-allowed text-muted-foreground/60",
              )}
            >
              {isDone ? (
                <Check className="size-3.5 text-success-600" />
              ) : (
                <s.icon className="size-3.5" />
              )}
              {s.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function GeneratingState({ topic }: { topic: string }) {
  const steps = [
    { label: "Planner", detail: "Picking mechanic, scenes, variables" },
    {
      label: "Mechanic Designer",
      detail: "Writing formulas & calibrating ranges",
    },
    { label: "Content Writer", detail: "Drafting student & teacher copy" },
    { label: "Reviewer", detail: "Critiquing the assembled blueprint" },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const i = setInterval(() => {
      setActive((a) => Math.min(a + 1, steps.length - 1));
    }, 3500);
    return () => clearInterval(i);
  }, []);
  return (
    <Card className="border-primary-100/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="size-4 animate-spin text-primary-500" />
          Generating blueprint for "{topic}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-start gap-2 text-sm">
            <div className="pt-0.5">
              {i < active ? (
                <Check className="size-4 text-success-600" />
              ) : i === active ? (
                <Loader2 className="size-4 animate-spin text-primary-500" />
              ) : (
                <span className="block size-4 rounded-full border" />
              )}
            </div>
            <div>
              <div
                className={
                  i <= active ? "text-foreground" : "text-muted-foreground"
                }
              >
                {s.label}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {s.detail}
              </div>
            </div>
          </div>
        ))}
        <p className="pt-3 text-muted-foreground text-xs">
          Four specialist stages run sequentially; expect ~15–40s end to end.
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-error-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-error-800">
          <AlertTriangle className="size-4" />
          Blueprint generation failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-foreground/80 text-sm">{message}</p>
        <p className="text-muted-foreground text-xs">
          If the platform is missing OPENAI_API_KEY, ask an admin to add it to
          the apps/web Vercel project. Then retry.
        </p>
        <Button onClick={onRetry}>Retry generation</Button>
      </CardContent>
    </Card>
  );
}

function StageTimeline({
  meta,
  defaultOpen,
}: {
  meta: EngineMeta;
  defaultOpen: boolean;
}) {
  const failing = meta.stages.find((s) => !s.ok);
  return (
    <details
      open={defaultOpen}
      className="rounded-lg border border-primary-100/60 bg-background"
    >
      <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          Engine timeline ·{" "}
          <span className="font-medium text-foreground">
            {meta.stages.length} stage runs
          </span>{" "}
          ·{" "}
          <span className="font-medium text-foreground">
            {(meta.totalLatencyMs / 1000).toFixed(1)}s total
          </span>
          {meta.revisionCount > 0
            ? ` · ${meta.revisionCount} revision pass${meta.revisionCount === 1 ? "" : "es"}`
            : ""}
          {failing ? (
            <span className="ml-2 text-destructive">
              · failing at <code>{failing.name}</code>
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground/60">▾</span>
      </summary>
      <div className="border-t">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Stage</th>
              <th className="px-4 py-2 text-left font-medium">Attempt</th>
              <th className="px-4 py-2 text-left font-medium">Model</th>
              <th className="px-4 py-2 text-right font-medium">Latency</th>
              <th className="px-4 py-2 text-left font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {meta.stages.map((s, i) => (
              <tr key={`${s.name}-${i}`} className="border-t">
                <td className="px-4 py-2 font-medium">{s.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{s.attempt}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  <code className="text-[11px]">{s.model}</code>
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                  {(s.latencyMs / 1000).toFixed(2)}s
                </td>
                <td className="px-4 py-2">
                  {s.ok ? (
                    <span className="text-success-600">pass</span>
                  ) : (
                    <span className="text-destructive">
                      {s.error ?? "fail"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.review ? (
          <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
            Reviewer: <span className="font-medium">{meta.review.verdict}</span>{" "}
            · pedagogy {meta.review.scores.pedagogy.toFixed(1)} · mechanic{" "}
            {meta.review.scores.mechanic.toFixed(1)} · copy{" "}
            {meta.review.scores.copy.toFixed(1)} · classroom fit{" "}
            {meta.review.scores.classroomFit.toFixed(1)}
            {meta.review.summary ? ` — "${meta.review.summary}"` : ""}
          </div>
        ) : null}
        {meta.keyFingerprint ? (
          <div className="border-t bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
            OpenAI key: <code>{meta.keyFingerprint}</code>
          </div>
        ) : null}
      </div>
    </details>
  );
}
