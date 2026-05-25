# Scott's Experiment

A skunkworks **One-Shot Learning Companion Studio** — turn a structured
lesson brief into a classroom-ready interactive lesson module through
an orchestrated multi-agent workflow.

Eventually braided into the proper workflow areas in the ABStudios
platform; for now it lives standalone so we can iterate without being
gated on the main app's deploy pipeline.

## Quickstart

```bash
pnpm install
cp .env.example .env
# put your OPENAI_API_KEY in .env
pnpm dev
# open http://localhost:3001
```

## Routes

| URL | What |
| --- | --- |
| `/` | Landing |
| `/new` | Brief intake form |
| `/runs` | History of runs saved on this device |
| `/run/demo-paper-airplane` | Reference build (hardcoded, no LLM spend) |
| `/run/[id]` | Generated run dashboard (Blueprint → Build → Preview → QA → Publish) |
| `POST /api/blueprint` | Multi-stage engine endpoint (Planner → Mechanic → Writer → Reviewer) |

## Stack

- Next.js 15 (App Router, Turbopack)
- React 19
- Tailwind 3 + lucide-react
- ai-sdk + OpenAI (`gpt-4o-mini`)
- zod for runtime + structured-output validation
- Biome for lint/format

No database. Runs are persisted in browser localStorage.

## Architecture

```
src/
├── app/
│   ├── layout.tsx                       Shell + brand header
│   ├── page.tsx                         Landing
│   ├── new/page.tsx                     Brief intake
│   ├── runs/page.tsx                    Run history
│   ├── run/[id]/page.tsx                Pipeline dashboard
│   └── api/blueprint/route.ts           Engine endpoint
├── components/
│   ├── blueprint-schema.ts              Zod schema + validator + formula evaluator
│   ├── brand-header.tsx
│   ├── brief-form.tsx
│   ├── exports.ts                       Teacher guide / worksheet / blueprint JSON
│   ├── qa-checks.ts                     Heuristic QA against the live blueprint
│   ├── run-store.ts                     localStorage namespace for runs
│   ├── simulation-lab.tsx               Generic renderer: projectile or bars
│   ├── stages/                          Per-stage UI (blueprint, build, preview, qa, publish)
│   └── ui/                              Button, Card, Badge, Tooltip
├── engine/
│   ├── runner.ts                        Multi-stage orchestrator
│   ├── prompts.ts                       System prompts per agent role
│   └── types.ts                         Engine input / output / meta schemas
└── lib/utils.ts                         cn() class-merge helper
```

## The engine

A single POST to `/api/blueprint` runs four stages in sequence, each
backed by a specialist agent prompt:

1. **Planner** — converts the brief into a plan (objectives, scenes, vocab).
2. **Mechanic** — designs the variables, outcomes, formulas, and viz kind.
3. **Writer** — drafts student/teacher copy, tips, assessments.
4. **Reviewer** — verdicts (`approve` | `revise`) the assembled blueprint.

The blueprint is validated against a zod schema and a formula-sanity
check (every outcome must evaluate to a finite number across the
variable sample grid). One repair pass happens automatically when the
validator finds issues.

## Eventually braiding back into ABStudios

When ready, the engine and schema (`src/engine/*`, `src/components/
blueprint-schema.ts`, `src/components/qa-checks.ts`, `src/components/
exports.ts`) are the natural promotion candidates — they're framework-
agnostic and have no UI dependencies. The UI in `src/app/*` and
`src/components/stages/*` is the UX surface we'd remount inside the
main app's route shell.

## What's intentionally not here

- No auth / users.
- No persistent storage. Each device sees its own runs.
- No model broker yet. Direct OpenAI calls only; OpenRouter / Anthropic
  / Google adapter is the natural next step.
- No real factuality reviewer (`Reviewer` checks structure, not facts).
- No SCORM / static-zip export. JSON and Markdown only.
