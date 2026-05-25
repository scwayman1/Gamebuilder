"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Archive,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Printer,
  School,
} from "lucide-react";
import { useState } from "react";
import type { Blueprint } from "../blueprint-schema";
import {
  blueprintToJson,
  blueprintToStudentWorksheet,
  blueprintToTeacherGuide,
  downloadText,
  slugify,
} from "../exports";

export function PublishStage({ blueprint }: { blueprint: Blueprint }) {
  const slug = slugify(blueprint.moduleTitle);
  const url = `https://preview.abstudios.app/modules/${slug}`;
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadJson = () =>
    downloadText(
      `${slug}.blueprint.json`,
      blueprintToJson(blueprint),
      "application/json",
    );
  const downloadGuide = () =>
    downloadText(
      `${slug}.teacher-guide.md`,
      blueprintToTeacherGuide(blueprint),
      "text/markdown",
    );
  const downloadWorksheet = () =>
    downloadText(
      `${slug}.student-worksheet.md`,
      blueprintToStudentWorksheet(blueprint),
      "text/markdown",
    );

  const exports = [
    {
      icon: ExternalLink,
      title: "Hosted preview",
      body: "Public read-only preview URL the content team can share.",
      onClick: onCopy,
      hint: "Click to copy URL",
    },
    {
      icon: FileJson,
      title: "Blueprint JSON",
      body: "Machine-readable blueprint for re-import and version control.",
      onClick: downloadJson,
      hint: "Download .json",
    },
    {
      icon: FileText,
      title: "Teacher guide (Markdown)",
      body: "Objectives, prep, prompts, vocab, and standards mapping.",
      onClick: downloadGuide,
      hint: "Download .md",
    },
    {
      icon: Printer,
      title: "Student worksheet (Markdown)",
      body: "Predict / test / observe / explain sheet for the classroom.",
      onClick: downloadWorksheet,
      hint: "Download .md",
    },
    {
      icon: Archive,
      title: "Static web bundle (.zip)",
      body: "Self-contained module zip ready to embed in ABStudios.",
      onClick: undefined,
      hint: "Coming next",
    },
    {
      icon: School,
      title: "LMS package (SCORM)",
      body: "Drop-in for school districts using a managed LMS.",
      onClick: undefined,
      hint: "Coming next",
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="border-primary-100/60 bg-gradient-to-br from-primary-50/60 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ready to publish</CardTitle>
          <CardDescription>
            Last review gate. Publishing creates a versioned release of this
            module and records the prompt-pack versions used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-background p-2 pl-3">
            <span className="text-muted-foreground text-xs">URL</span>
            <code className="flex-1 truncate text-xs">{url}</code>
            <Button size="sm" variant="outline" onClick={onCopy}>
              <Copy className="size-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {exports.map((e) => {
              const disabled = !e.onClick;
              return (
                <button
                  key={e.title}
                  type="button"
                  onClick={e.onClick}
                  disabled={disabled}
                  className="group flex items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-background"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                    <e.icon className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      {e.body}
                    </div>
                    <div className="pt-1 text-[10px] text-muted-foreground/70">
                      {e.hint}
                    </div>
                  </div>
                  {!disabled ? (
                    <Download className="ml-auto size-3.5 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary-100/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Release notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-foreground/85 text-sm">
          <p>
            <span className="font-medium">{blueprint.moduleTitle}</span> ·{" "}
            {blueprint.gradeBand} · {blueprint.subject} ·{" "}
            {blueprint.durationMinutes} min
          </p>
          <p className="text-muted-foreground">
            Generated from approved templates ({blueprint.template}). Sources:{" "}
            {blueprint.sourceAttribution.join("; ") || "none recorded"}.
          </p>
          <p className="text-muted-foreground text-xs">
            Prompt-pack versions: brand-voice@1.2, learning-objective@0.9,
            mechanic-selection@0.7, accessibility@1.0, release-qa@0.4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
