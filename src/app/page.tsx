import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  FileText,
  PlayCircle,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";

const pipeline = [
  {
    icon: FileText,
    title: "Brief",
    body: "Content team submits a structured lesson brief.",
  },
  {
    icon: Wand2,
    title: "Blueprint",
    body: "Planner agents propose a scoped module concept for review.",
  },
  {
    icon: Boxes,
    title: "Build",
    body: "Specialist agents work in parallel against approved templates.",
  },
  {
    icon: ClipboardCheck,
    title: "QA",
    body: "Pedagogy, accuracy, accessibility, and device checks.",
  },
  {
    icon: Rocket,
    title: "Publish",
    body: "Hosted preview, teacher guide, and LMS-ready export.",
  },
];

const templates = [
  {
    name: "Simulation Lab",
    desc: "Sliders, animated visualization, metrics, explanation panel.",
  },
  {
    name: "Build-and-Test Activity",
    desc: "Physical making steps plus a digital test/simulation.",
  },
  {
    name: "Scenario Challenge",
    desc: "Mission-based applied learning with branching outcomes.",
  },
];

export default function ScottsExperimentLanding() {
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-10 pt-8 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Badge
            variant="outline"
            className="border-primary-200 text-primary-700"
          >
            <Sparkles className="mr-1.5 size-3" />
            One-Shot Learning Companion Studio
          </Badge>
          <h1 className="font-semibold text-4xl leading-tight tracking-tight md:text-5xl">
            Turn a lesson brief into a{" "}
            <span className="bg-main-gradient bg-clip-text text-transparent">
              classroom-ready
            </span>{" "}
            interactive companion.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground leading-relaxed">
            An internal AB Studios tool that lets the content team go from a
            structured brief to a polished, curriculum-aligned interactive
            module — with teacher notes, assessments, and export package —
            through an orchestrated multi-agent workflow.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/new">
                Start a new module
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/run/demo-paper-airplane">
                <PlayCircle className="size-4" />
                See the reference build
              </Link>
            </Button>
          </div>
          <p className="pt-2 text-muted-foreground text-xs">
            Skunkworks preview. Generation is mocked end-to-end; no models,
            users, or datastores touched.
          </p>
        </div>

        <Card className="overflow-hidden border-primary-100/70 shadow-md">
          <div className="bg-main-gradient px-5 py-3 font-semibold text-[11px] text-white/90 uppercase tracking-wider">
            Reference artifact
          </div>
          <CardContent className="space-y-3 p-5">
            <div className="font-semibold text-lg">
              Paper Airplane Simulator
            </div>
            <p className="text-muted-foreground text-sm">
              Grade 4 STEM companion teaching thrust, drag, lift, and center of
              gravity through folding, simulating, and comparing designs.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Flight Sim",
                "Wind Tunnel",
                "How to Fold",
                "6 sessions",
                "Sliders",
                "Did You Know?",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-[11px] text-primary-700"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="pt-2">
              <Button asChild variant="link" className="h-auto px-0">
                <Link href="/run/demo-paper-airplane">
                  Open the demo run
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-semibold text-xl">The pipeline</h2>
          <span className="text-muted-foreground text-xs">
            Each stage produces a reviewable artifact.
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {pipeline.map((s, i) => (
            <Card key={s.title} className="border-primary-100/60">
              <CardHeader className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                    <s.icon className="size-4" />
                  </span>
                  <span className="font-medium text-[10px] text-muted-foreground">
                    Stage {i + 1}
                  </span>
                </div>
                <CardTitle className="text-sm">{s.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {s.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-semibold text-xl">MVP template families</h2>
          <span className="text-muted-foreground text-xs">
            Modules generate into approved templates only.
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.name} className="border-primary-100/60">
              <CardHeader className="p-5">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {t.desc}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
