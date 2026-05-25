"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import type { Blueprint } from "../blueprint-schema";
import { SimulationLab } from "../simulation-lab";

const sizes = {
  mobile: { w: "375px", icon: Smartphone, label: "Mobile" },
  tablet: { w: "820px", icon: Tablet, label: "Tablet" },
  desktop: { w: "100%", icon: Monitor, label: "Desktop" },
};

export function PreviewStage({
  blueprint,
  onNext,
}: {
  blueprint: Blueprint;
  onNext: () => void;
}) {
  const [size, setSize] = useState<keyof typeof sizes>("desktop");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs">Hosted preview</div>
          <div className="font-medium">{blueprint.moduleTitle}</div>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          {Object.entries(sizes).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSize(k as keyof typeof sizes)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
                size === k
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <v.icon className="size-3.5" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div
          style={{ maxWidth: sizes[size].w }}
          className="mx-auto overflow-hidden rounded-lg border bg-background shadow-sm"
        >
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-red-300" />
            <span className="size-2 rounded-full bg-yellow-300" />
            <span className="size-2 rounded-full bg-green-300" />
            <span className="ml-3 truncate">
              abstudios.app/modules/
              {blueprint.moduleTitle.toLowerCase().replace(/\s+/g, "-")}
            </span>
          </div>
          <div className="p-4">
            <SimulationLab blueprint={blueprint} />
          </div>
        </div>
      </div>

      <Card className="border-primary-100/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Teacher one-pager</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 text-sm">
            <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Prep
            </div>
            <ul className="list-disc space-y-1 pl-4 text-foreground/85">
              {blueprint.teacherPrep.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Reflection prompts
            </div>
            <ul className="list-disc space-y-1 pl-4 text-foreground/85">
              {blueprint.assessments.slice(0, 5).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext}>Run QA</Button>
      </div>
    </div>
  );
}
