"use client";

import {
  type RunIndexEntry,
  deleteRun,
  listRuns,
} from "@/components/run-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<RunIndexEntry[]>([]);

  useEffect(() => {
    setRuns(listRuns());
  }, []);

  const remove = (id: string) => {
    deleteRun(id);
    setRuns(listRuns());
  };

  return (
    <div className="space-y-6 pt-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        Back
      </Link>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Run history</h1>
          <p className="pt-1 text-muted-foreground text-sm">
            Every module you've generated on this device. Stored locally — not
            shared yet.
          </p>
        </div>
        <Button asChild>
          <Link href="/new">New module</Link>
        </Button>
      </div>

      {runs.length === 0 ? (
        <Card className="border-primary-100/60">
          <CardContent className="p-10 text-center">
            <p className="text-muted-foreground text-sm">
              No runs yet. Start a new module and it'll show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Topic</th>
                <th className="px-4 py-2 text-left font-medium">Grade</th>
                <th className="px-4 py-2 text-left font-medium">Duration</th>
                <th className="px-4 py-2 text-left font-medium">Created</th>
                <th className="w-px px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/run/${r.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {r.topic || "(untitled)"}
                    </Link>
                    <div className="pt-0.5 text-[11px] text-muted-foreground">
                      <code>{r.id}</code>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.gradeBand}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.durationMinutes} min
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {relativeTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="ghost" tooltip="Open">
                        <Link href={`/run/${r.id}`}>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        tooltip="Delete"
                        onClick={() => remove(r.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
