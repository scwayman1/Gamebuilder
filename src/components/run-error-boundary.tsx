"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; runId: string };
type State = { error: Error | null; info: ErrorInfo | null };

export class RunErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[RunErrorBoundary] caught client-side exception:",
      error,
      info,
    );
    this.setState({ error, info });
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  forgetRun = () => {
    if (typeof window === "undefined") return;
    const runId = this.props.runId;
    window.localStorage.removeItem(`scotts-experiment:brief:${runId}`);
    window.localStorage.removeItem(`scotts-experiment:blueprint:${runId}`);
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;
    const e = this.state.error;
    return (
      <div className="space-y-6 pt-2">
        <Card className="border-destructive/30 bg-error-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-error-800">
              <AlertTriangle className="size-4" />
              Run page hit a client-side exception
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-foreground/80 text-sm">
              This usually means a blueprint stored from an earlier version of
              the app has a shape the new code doesn't accept, and a downstream
              renderer (editor, simulator, QA) tripped on it.
            </p>
            <div className="rounded-md border bg-background/60 p-3">
              <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                Error
              </div>
              <p className="pt-1 font-mono text-xs text-foreground/90">
                {e.name}: {e.message}
              </p>
              {e.stack ? (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">
                  {e.stack.split("\n").slice(0, 8).join("\n")}
                </pre>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={this.reset} variant="outline">
                Try again
              </Button>
              <Button onClick={this.forgetRun} variant="outline">
                Discard this run and go home
              </Button>
              <Button asChild variant="outline">
                <Link href="/runs">Open run history</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
