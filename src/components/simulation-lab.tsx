"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type Blueprint,
  type BlueprintOutcome,
  type BlueprintVariable,
  evalFormula,
  inferVisualizationKind,
} from "./blueprint-schema";

export function SimulationLab({ blueprint }: { blueprint: Blueprint }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(blueprint.variables.map((v) => [v.id, v.default])),
  );
  const [tipIdx, setTipIdx] = useState(0);
  const [runKey, setRunKey] = useState(0);

  // Re-init values when blueprint changes (different topic loaded)
  useEffect(() => {
    setValues(
      Object.fromEntries(blueprint.variables.map((v) => [v.id, v.default])),
    );
  }, [blueprint]);

  const outcomes = useMemo(
    () =>
      blueprint.outcomes.map((o) => ({
        outcome: o,
        value: evalFormula(o.formula, values),
      })),
    [blueprint.outcomes, values],
  );

  const primary =
    outcomes.find((o) => o.outcome.isPrimary) ?? outcomes[0] ?? null;
  const secondary = outcomes.find((o) => o !== primary) ?? null;

  const launch = () => {
    setTipIdx((i) => (i + 1) % blueprint.tips.length);
    setRunKey((k) => k + 1);
  };

  const visKind = inferVisualizationKind(blueprint);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
        {visKind === "bars" ? (
          <BarsStage runKey={runKey} outcomes={outcomes} onLaunch={launch} />
        ) : (
          <TrajectoryStage
            runKey={runKey}
            primary={primary}
            secondary={secondary}
            onLaunch={launch}
          />
        )}
        <div className="space-y-3">
          {outcomes.map(({ outcome, value }) => (
            <OutcomeCard key={outcome.id} outcome={outcome} value={value} />
          ))}
          {blueprint.tips.length > 0 ? (
            <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-3">
              <div className="font-semibold text-[10px] text-primary-700 uppercase tracking-wider">
                Did you know?
              </div>
              <p className="pt-1 text-foreground/80 text-xs">
                {blueprint.tips[tipIdx]}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3 rounded-xl border bg-background p-4",
          blueprint.variables.length <= 2 && "sm:grid-cols-2",
          blueprint.variables.length === 3 && "sm:grid-cols-2 lg:grid-cols-3",
          blueprint.variables.length >= 4 && "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {blueprint.variables.map((v) => (
          <Slider
            key={v.id}
            variable={v}
            value={values[v.id] ?? v.default}
            onChange={(n) => setValues((s) => ({ ...s, [v.id]: n }))}
          />
        ))}
      </div>
    </div>
  );
}

function OutcomeCard({
  outcome,
  value,
}: {
  outcome: BlueprintOutcome;
  value: number;
}) {
  const isPercent =
    outcome.unit === "%" ||
    outcome.label.toLowerCase().includes("stability") ||
    outcome.label.toLowerCase().includes("accuracy");
  if (isPercent) {
    const pct = Math.max(0, Math.min(100, value));
    return (
      <div className="rounded-lg border p-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{outcome.label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-main-gradient"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }
  const fmt = Number.isFinite(value) ? value.toFixed(1) : "—";
  return (
    <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-3">
      <div className="text-[11px] text-muted-foreground">{outcome.label}</div>
      <div className="font-semibold text-2xl tracking-tight">
        {fmt}
        <span className="ml-1 font-normal text-muted-foreground text-sm">
          {outcome.unit}
        </span>
      </div>
    </div>
  );
}

function Slider({
  variable,
  value,
  onChange,
}: {
  variable: BlueprintVariable;
  value: number;
  onChange: (n: number) => void;
}) {
  const step = pickStep(variable);
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium">{variable.label}</span>
        <span className="text-muted-foreground">
          {value}
          {variable.unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={variable.min}
        max={variable.max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <p className="text-[10px] text-muted-foreground">
        {variable.studentExplanation}
      </p>
    </label>
  );
}

function pickStep(v: BlueprintVariable) {
  const range = v.max - v.min;
  if (range <= 5) return 0.1;
  if (range <= 20) return 0.5;
  return 1;
}

function TrajectoryStage({
  runKey,
  primary,
  secondary,
  onLaunch,
}: {
  runKey: number;
  primary: { outcome: BlueprintOutcome; value: number } | null;
  secondary: { outcome: BlueprintOutcome; value: number } | null;
  onLaunch: () => void;
}) {
  // Map the primary outcome's value to a horizontal "reach"
  // Treat the maximum credible value as ~30 for distance-y outcomes.
  const reach = Math.max(0, Math.min(primary?.value ?? 0, 30));
  const height = Math.max(0, Math.min(secondary?.value ?? 1, 4));
  const width = 600;
  const h = 280;
  const endX = 50 + (width - 90) * (reach / 30);
  const apexY = h * (0.65 - Math.min(height, 4) * 0.1);
  const startY = h * 0.78;
  const endY = h * 0.82;
  const cx1 = 50 + (endX - 50) * 0.3;
  const cy1 = startY - (startY - apexY) * 1.2;
  const cx2 = 50 + (endX - 50) * 0.7;
  const cy2 = apexY + (endY - apexY) * 0.2;
  const path = `M50,${startY} C${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-sky-50 to-sky-100">
      <svg
        viewBox={`0 0 ${width} ${h}`}
        className="block h-[280px] w-full"
        role="img"
        aria-label="Simulation trajectory"
      >
        <title>Simulation trajectory</title>
        <defs>
          <linearGradient id="ground-sim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#bbf7d0" />
            <stop offset="1" stopColor="#86efac" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y={h - 30}
          width={width}
          height="30"
          fill="url(#ground-sim)"
        />
        {[0, 5, 10, 15, 20, 25, 30].map((m) => {
          const x = 50 + (width - 90) * (m / 30);
          return (
            <g key={m}>
              <line
                x1={x}
                x2={x}
                y1={h - 30}
                y2={h - 24}
                stroke="#16a34a"
                strokeWidth="1"
              />
              <text
                x={x}
                y={h - 12}
                textAnchor="middle"
                fontSize="9"
                fill="#065f46"
              >
                {m}
                {primary?.outcome.unit ?? ""}
              </text>
            </g>
          );
        })}
        <path
          d={path}
          stroke="#9333ea"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          fill="none"
          opacity="0.5"
        />
        <g key={runKey}>
          <animateMotion dur="2.2s" repeatCount="1" path={path} fill="freeze" />
          <circle r="6" fill="#ED7724" stroke="#79346D" strokeWidth="1" />
        </g>
      </svg>
      <div className="absolute top-3 left-3 rounded-md bg-background/80 px-2 py-1 text-[11px] text-foreground/80 backdrop-blur">
        Primary: {primary?.outcome.label ?? "—"}
      </div>
      <div className="absolute top-3 right-3">
        <Button size="sm" onClick={onLaunch}>
          <RefreshCw className="size-3.5" />
          Run
        </Button>
      </div>
    </div>
  );
}

function BarsStage({
  runKey,
  outcomes,
  onLaunch,
}: {
  runKey: number;
  outcomes: Array<{ outcome: BlueprintOutcome; value: number }>;
  onLaunch: () => void;
}) {
  const top = outcomes.slice(0, 4);
  const max = Math.max(
    1,
    ...top.map((o) => (Number.isFinite(o.value) ? Math.abs(o.value) : 0)),
  );
  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-primary-50/40 to-background p-5">
      <div className="space-y-3" key={runKey}>
        {top.map(({ outcome, value }, i) => {
          const pct = Math.max(0, Math.min(100, (value / max) * 100));
          const label = Number.isFinite(value) ? value.toFixed(1) : "—";
          return (
            <div key={outcome.id} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-foreground/85 text-sm">
                  {outcome.label}
                  {outcome.isPrimary ? (
                    <span className="ml-1.5 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700">
                      primary
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-sm">
                  {label} {outcome.unit}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-main-gradient transition-[width] duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute top-3 right-3">
        <Button size="sm" onClick={onLaunch}>
          <RefreshCw className="size-3.5" />
          Run
        </Button>
      </div>
    </div>
  );
}
