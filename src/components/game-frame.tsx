"use client";

// Sandboxed runtime for LLM-generated game code — the execution half of
// the "Debug Skill". The iframe gets allow-scripts only (opaque origin,
// no same-origin, no popups). The frozen harness inside the skeleton
// postMessages runtime state up to us; we collect errors for the repair
// loop and show a live status chip + console panel.

import { Button } from "@/components/ui/button";
import type { HarnessMessage } from "@/game/schema";
import { cn } from "@/lib/utils";
import { Maximize2, RefreshCw } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type GameRuntimeStatus = "booting" | "ready" | "crashed";

export type GameRuntimeError = { message: string; stack?: string | null };

// Imperative playtest API used by the judge orchestration: drive ghost
// input and pull screenshots out of the sandboxed game.
export type GameFrameHandle = {
  capture: () => Promise<string | null>;
  fuzz: (durationMs: number) => void;
  getRuntime: () => {
    ready: boolean;
    errors: string[];
    lastScore: number | null;
  };
};

export const GameFrame = forwardRef<
  GameFrameHandle,
  {
    html: string;
    onErrorsChange?: (errors: GameRuntimeError[]) => void;
  }
>(function GameFrame({ html, onErrorsChange }, handleRef) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<GameRuntimeStatus>("booting");
  const [errors, setErrors] = useState<GameRuntimeError[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const statusRef = useRef<GameRuntimeStatus>("booting");
  const errorsRef = useRef<GameRuntimeError[]>([]);
  const scoreRef = useRef<number | null>(null);
  const pendingCaptures = useRef(
    new Map<string, (dataUrl: string | null) => void>(),
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only accept harness messages from our own iframe.
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as {
        __gameHarness?: boolean;
        type?: string;
        payload?: Record<string, unknown>;
      };
      if (!data || data.__gameHarness !== true || !data.type) return;
      const msg = {
        type: data.type,
        ...(data.payload ?? {}),
      } as HarnessMessage;
      if (msg.type === "ready") {
        setStatus((s) => (s === "crashed" ? s : "ready"));
      } else if (msg.type === "error" || msg.type === "console.error") {
        setStatus("crashed");
        setErrors((prev) => {
          if (prev.length >= 20) return prev;
          const next = [
            ...prev,
            {
              message: msg.message,
              stack: "stack" in msg ? (msg.stack ?? null) : null,
            },
          ];
          return next;
        });
      } else if (msg.type === "score") {
        setScore(msg.score);
      } else if (msg.type === "capture") {
        const resolve = pendingCaptures.current.get(msg.id);
        if (resolve) {
          pendingCaptures.current.delete(msg.id);
          resolve(msg.dataUrl);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useImperativeHandle(
    handleRef,
    () => ({
      capture: () =>
        new Promise<string | null>((resolve) => {
          const win = iframeRef.current?.contentWindow;
          if (!win) {
            resolve(null);
            return;
          }
          const id = Math.random().toString(36).slice(2, 10);
          pendingCaptures.current.set(id, resolve);
          // Time out captures the harness never answers (old builds,
          // crashed frames).
          setTimeout(() => {
            if (pendingCaptures.current.delete(id)) resolve(null);
          }, 4000);
          win.postMessage({ __gameParent: true, type: "capture", id }, "*");
        }),
      fuzz: (durationMs: number) => {
        iframeRef.current?.contentWindow?.postMessage(
          { __gameParent: true, type: "fuzz", durationMs },
          "*",
        );
      },
      getRuntime: () => ({
        ready: statusRef.current === "ready",
        errors: errorsRef.current.map((e) => e.message),
        lastScore: scoreRef.current,
      }),
    }),
    [],
  );

  // Propagate error list to the parent (for the repair loop, Loop B).
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  const reload = useCallback(() => {
    setStatus("booting");
    setErrors([]);
    setScore(null);
    setReloadKey((k) => k + 1);
  }, []);

  // Reset state when a new build arrives.
  // biome-ignore lint/correctness/useExhaustiveDependencies: html is the reset trigger
  useEffect(() => {
    reload();
  }, [html, reload]);

  const fullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide",
              status === "booting" &&
                "border-muted bg-muted/40 text-muted-foreground",
              status === "ready" &&
                "border-success-600/30 bg-success-background text-success-600",
              status === "crashed" &&
                "border-destructive/30 bg-error-background text-error-800",
            )}
          >
            {status}
          </span>
          {score !== null ? (
            <span className="text-muted-foreground text-xs">
              score: <span className="font-medium tabular-nums">{score}</span>
            </span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={fullscreen}>
            <Maximize2 className="size-3.5" />
            Fullscreen
          </Button>
          <Button size="sm" variant="outline" onClick={reload}>
            <RefreshCw className="size-3.5" />
            Restart
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-[#0f0f1a]">
        <iframe
          key={reloadKey}
          ref={iframeRef}
          title="Generated game"
          sandbox="allow-scripts"
          srcDoc={html}
          className="block aspect-[4/3] w-full"
        />
      </div>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-error-background p-3">
          <div className="font-semibold text-[10px] text-error-800 uppercase tracking-wider">
            Runtime errors ({errors.length})
          </div>
          <ul className="mt-1 max-h-40 space-y-1 overflow-auto">
            {errors.map((e, i) => (
              <li
                key={`${i}-${e.message.slice(0, 24)}`}
                className="font-mono text-[11px] text-foreground/80"
              >
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
});
