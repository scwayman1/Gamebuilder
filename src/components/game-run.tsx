"use client";

// Self-contained run view for code-gen game runs (companionType in
// GAME_COMPANION_TYPES). Owns generation, persistence, and the play
// surface. Deliberately separate from the blueprint pipeline so the two
// paths can evolve independently.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngineMeta } from "@/engine/types";
import type { GameArtifact, JudgeReport } from "@/game/schema";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Download,
  Gamepad2,
  Loader2,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  GameFrame,
  type GameFrameHandle,
  type GameRuntimeError,
} from "./game-frame";
import {
  type BriefInput,
  loadGameArtifact,
  saveGameArtifact,
} from "./run-store";

type GenState =
  | { phase: "generating" }
  | { phase: "ready"; artifact: GameArtifact; meta: EngineMeta | null }
  | { phase: "failed"; error: string; meta: EngineMeta | null };

async function generateGame(
  brief: BriefInput,
): Promise<{ artifact: GameArtifact; meta: EngineMeta }> {
  const res = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });
  const body = (await res.json().catch(() => ({}))) as {
    artifact?: GameArtifact;
    meta?: EngineMeta;
    error?: string;
  };
  if (!res.ok || !body.artifact) {
    const err = new Error(body.error ?? `Server error: ${res.status}`);
    (err as Error & { meta?: EngineMeta }).meta = body.meta;
    throw err;
  }
  return { artifact: body.artifact, meta: body.meta ?? null } as {
    artifact: GameArtifact;
    meta: EngineMeta;
  };
}

const MAX_AUTO_REPAIRS = 2;
// Wait this long after the first error so the harness can batch the
// full crash signature before we spend a repair attempt.
const REPAIR_DEBOUNCE_MS = 2500;

async function requestRepair(
  artifact: GameArtifact,
  errors: string[],
): Promise<GameArtifact> {
  const res = await fetch("/api/game/repair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artifact, errors: errors.slice(0, 10) }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    artifact?: GameArtifact;
    error?: string;
  };
  if (!res.ok || !body.artifact) {
    throw new Error(body.error ?? `Repair server error: ${res.status}`);
  }
  return body.artifact;
}

// Judge orchestration: ghost-playtest the running game, capture frames,
// send to the vision judge.
async function runJudgePlaytest(
  frame: GameFrameHandle,
  artifact: GameArtifact,
): Promise<JudgeReport> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const screenshots: string[] = [];

  // Frame 1: initial state.
  const s1 = await frame.capture();
  if (s1) screenshots.push(s1);
  // Frames 2-3: during/after ghost input bursts.
  frame.fuzz(2200);
  await sleep(2400);
  const s2 = await frame.capture();
  if (s2) screenshots.push(s2);
  frame.fuzz(2200);
  await sleep(2400);
  const s3 = await frame.capture();
  if (s3) screenshots.push(s3);

  if (screenshots.length === 0) {
    throw new Error(
      "Could not capture any screenshots — this build may predate the capture harness. Regenerate the game and try again.",
    );
  }

  const res = await fetch("/api/game/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design: artifact.design,
      screenshots,
      runtime: frame.getRuntime(),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    report?: JudgeReport;
    error?: string;
  };
  if (!res.ok || !body.report) {
    throw new Error(body.error ?? `Judge server error: ${res.status}`);
  }
  return body.report;
}

export function GameRun({
  runId,
  brief,
}: {
  runId: string;
  brief: BriefInput;
}) {
  const [state, setState] = useState<GenState>({ phase: "generating" });
  const [runtimeErrors, setRuntimeErrors] = useState<GameRuntimeError[]>([]);
  const [repairing, setRepairing] = useState(false);
  const [repairsUsed, setRepairsUsed] = useState(0);
  const [repairNote, setRepairNote] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const [judgeReport, setJudgeReport] = useState<JudgeReport | null>(null);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const started = useRef(false);
  const repairTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<GameFrameHandle>(null);

  const generate = () => {
    setState({ phase: "generating" });
    setRuntimeErrors([]);
    setRepairsUsed(0);
    setRepairNote(null);
    generateGame(brief)
      .then(({ artifact, meta }) => {
        saveGameArtifact(runId, artifact);
        setState({ phase: "ready", artifact, meta });
      })
      .catch((e: unknown) => {
        const meta =
          e instanceof Error
            ? ((e as Error & { meta?: EngineMeta }).meta ?? null)
            : null;
        setState({
          phase: "failed",
          error: e instanceof Error ? e.message : "Generation failed",
          meta,
        });
      });
  };

  const runRepair = (artifact: GameArtifact, errors: string[]) => {
    setRepairing(true);
    setRepairNote(null);
    requestRepair(artifact, errors)
      .then((fixed) => {
        saveGameArtifact(runId, fixed);
        setRuntimeErrors([]);
        setJudgeReport(null);
        setRepairsUsed((n) => n + 1);
        setRepairNote(
          `Auto-repair #${fixed.repairCount ?? 0} applied — rebooting the game.`,
        );
        setState({ phase: "ready", artifact: fixed, meta: null });
      })
      .catch((e: unknown) => {
        setRepairNote(
          `Auto-repair failed: ${e instanceof Error ? e.message : "unknown error"}. Try Regenerate for a fresh build.`,
        );
      })
      .finally(() => setRepairing(false));
  };

  const runJudge = (artifact: GameArtifact) => {
    const frame = frameRef.current;
    if (!frame || judging) return;
    setJudging(true);
    setJudgeError(null);
    setJudgeReport(null);
    runJudgePlaytest(frame, artifact)
      .then(setJudgeReport)
      .catch((e: unknown) =>
        setJudgeError(e instanceof Error ? e.message : "Judge failed"),
      )
      .finally(() => setJudging(false));
  };

  const applyJudgeFixes = (artifact: GameArtifact, report: JudgeReport) => {
    const fixable = report.issues.filter((i) => i.severity !== "nit");
    if (fixable.length === 0) return;
    runRepair(
      artifact,
      fixable.map(
        (i) => `QA judge (${i.severity}): ${i.problem} — fix: ${i.suggestion}`,
      ),
    );
  };

  // Debug Skill: when the sandbox reports a crash, debounce to collect the
  // full error batch, then auto-repair within budget.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runRepair is recreated each render; deps cover the trigger conditions
  useEffect(() => {
    if (state.phase !== "ready") return;
    if (runtimeErrors.length === 0 || repairing) return;
    if (repairsUsed >= MAX_AUTO_REPAIRS) {
      setRepairNote(
        `Auto-repair budget exhausted (${MAX_AUTO_REPAIRS}). Use Regenerate for a fresh build.`,
      );
      return;
    }
    const artifact = state.artifact;
    if (repairTimer.current) clearTimeout(repairTimer.current);
    repairTimer.current = setTimeout(() => {
      // Re-read latest errors via state setter to avoid staleness.
      setRuntimeErrors((latest) => {
        if (latest.length > 0)
          runRepair(
            artifact,
            latest.map((e) => e.message),
          );
        return latest;
      });
    }, REPAIR_DEBOUNCE_MS);
    return () => {
      if (repairTimer.current) clearTimeout(repairTimer.current);
    };
  }, [runtimeErrors, state, repairing, repairsUsed]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per mount; generate is stable for the life of this run
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const existing = loadGameArtifact(runId);
    if (existing) {
      setState({ phase: "ready", artifact: existing, meta: null });
      return;
    }
    generate();
  }, []);

  if (state.phase === "generating") {
    return <GeneratingCard topic={brief.topic} />;
  }

  if (state.phase === "failed") {
    return (
      <Card className="border-destructive/30 bg-error-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-error-800">
            <AlertTriangle className="size-4" />
            Game generation failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-foreground/80 text-sm">{state.error}</p>
          <Button onClick={generate}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { artifact } = state;
  const downloadGame = () => {
    const blob = new Blob([artifact.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <Card className="border-primary-100/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="size-5 text-primary-500" />
              {artifact.title}
            </CardTitle>
            <p className="pt-1 text-muted-foreground text-sm">
              {artifact.design.concept}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              onClick={() => runJudge(artifact)}
              disabled={judging || repairing}
            >
              <ClipboardCheck className="size-3.5" />
              {judging ? "Judging…" : "Run QA judge"}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadGame}>
              <Download className="size-3.5" />
              Download .html
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "Discard this game and generate a new one from the same brief?",
                  )
                ) {
                  generate();
                }
              }}
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <GameFrame
            ref={frameRef}
            html={artifact.html}
            onErrorsChange={setRuntimeErrors}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <DesignNote label="How to play" body={artifact.design.controls} />
            <DesignNote
              label="What it teaches"
              body={artifact.design.learningTieIn}
            />
            <DesignNote
              label="Win condition"
              body={artifact.design.winCondition}
            />
          </div>

          {repairing ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50/40 p-3 text-sm">
              <Loader2 className="size-4 animate-spin text-primary-500" />
              <span>
                Auto-repairing from the captured runtime errors (attempt{" "}
                {repairsUsed + 1}/{MAX_AUTO_REPAIRS})…
              </span>
            </div>
          ) : repairNote ? (
            <p className="text-muted-foreground text-xs">{repairNote}</p>
          ) : runtimeErrors.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Crash detected — collecting the error batch for auto-repair…
            </p>
          ) : null}

          {judging ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50/40 p-3 text-sm">
              <Loader2 className="size-4 animate-spin text-primary-500" />
              <span>
                Ghost-playtesting the game and judging screenshots — about 15
                seconds…
              </span>
            </div>
          ) : judgeError ? (
            <p className="text-error-800 text-xs">{judgeError}</p>
          ) : null}
        </CardContent>
      </Card>

      {judgeReport ? (
        <JudgePanel
          report={judgeReport}
          onApplyFixes={
            judgeReport.issues.some((i) => i.severity !== "nit") && !repairing
              ? () => applyJudgeFixes(artifact, judgeReport)
              : undefined
          }
        />
      ) : null}

      <details className="rounded-lg border border-primary-100/60 bg-background">
        <summary className="cursor-pointer px-4 py-2.5 text-muted-foreground text-xs">
          Design details & tunables
        </summary>
        <div className="space-y-3 border-t p-4 text-sm">
          <DesignNote label="Visual style" body={artifact.design.visualStyle} />
          <DesignNote
            label="Difficulty ramp"
            body={artifact.design.difficultyRamp}
          />
          <div>
            <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Config tunables
            </div>
            <ul className="mt-1 space-y-1">
              {artifact.design.configSpec.map((c) => (
                <li key={c.key} className="text-foreground/80 text-xs">
                  <code className="font-medium">{c.key}</code> = {c.value} —{" "}
                  {c.meaning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}

const judgeSeverityIcon = {
  nit: <Check className="size-3.5 text-muted-foreground" />,
  issue: <AlertTriangle className="size-3.5 text-secondary-600" />,
  blocker: <AlertTriangle className="size-3.5 text-destructive" />,
};

function JudgePanel({
  report,
  onApplyFixes,
}: {
  report: JudgeReport;
  onApplyFixes?: () => void;
}) {
  const verdictTone: Record<JudgeReport["verdict"], string> = {
    approve: "text-success-600 border-success-600/30 bg-success-background",
    revise: "text-secondary-700 border-secondary-200 bg-secondary-50/50",
    reject: "text-error-800 border-destructive/30 bg-error-background",
  };
  return (
    <Card className="border-primary-100/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary-500" />
          Visual QA Judge
        </CardTitle>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide",
            verdictTone[report.verdict],
          )}
        >
          verdict: {report.verdict}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-foreground/85 text-sm italic">"{report.summary}"</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <JudgeScore label="Build health" value={report.scores.buildHealth} />
          <JudgeScore
            label="Visual usability"
            value={report.scores.visualUsability}
          />
          <JudgeScore
            label="Brief fidelity"
            value={report.scores.briefFidelity}
          />
          <JudgeScore
            label="Learning alignment"
            value={report.scores.learningAlignment}
          />
        </div>
        {report.issues.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                Issues
              </div>
              {onApplyFixes ? (
                <Button size="sm" variant="outline" onClick={onApplyFixes}>
                  <Wrench className="size-3.5" />
                  Send fixes to repair
                </Button>
              ) : null}
            </div>
            <ul className="space-y-1.5">
              {report.issues.map((c, i) => (
                <li
                  key={`${c.severity}-${i}`}
                  className="rounded-md border bg-background/50 p-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {judgeSeverityIcon[c.severity]}
                    <span className="font-medium">{c.problem}</span>
                  </div>
                  <div className="pt-1 pl-5 text-muted-foreground text-xs">
                    Fix: {c.suggestion}
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

function JudgeScore({ label, value }: { label: string; value: number }) {
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

function DesignNote({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <p className="pt-1 text-foreground/85 text-sm">{body}</p>
    </div>
  );
}

function GeneratingCard({ topic }: { topic: string }) {
  const steps = [
    "Designing the game mechanic",
    "Writing Phaser code into the template",
    "Running static safety checks",
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setActive((a) => Math.min(a + 1, 2)), 6000);
    return () => clearInterval(i);
  }, []);
  return (
    <Card className="border-primary-100/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="size-4 animate-spin text-primary-500" />
          Building a game for "{topic}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 text-sm">
            {i < active ? (
              <Check className="size-4 text-success-600" />
            ) : i === active ? (
              <Loader2 className="size-4 animate-spin text-primary-500" />
            ) : (
              <span className="size-4 rounded-full border" />
            )}
            <span
              className={
                i <= active ? "text-foreground" : "text-muted-foreground"
              }
            >
              {s}
            </span>
          </div>
        ))}
        <p className="pt-3 text-muted-foreground text-xs">
          Code generation uses a larger model — expect 20–45 seconds.
        </p>
      </CardContent>
    </Card>
  );
}
