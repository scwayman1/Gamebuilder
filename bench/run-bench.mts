// OpenGame-Bench-style batch evaluation harness.
//
// For each benchmark brief: generate a game through the real engine,
// boot it in a headless browser, ghost-playtest it, capture frames,
// run the vision judge, and aggregate scores into a report.
//
// Usage:
//   OPENAI_API_KEY=sk-... pnpm bench           # full run (costs ~$0.10-0.30/brief)
//   pnpm bench --dry                            # mechanics check, no API calls
//   pnpm bench --only multiplication-facts      # subset
//
// Requires playwright + a chromium: pnpm add -D playwright && npx playwright install chromium
// Overrides: PLAYWRIGHT_MODULE (module path), CHROME_PATH (executable).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { judgeGame } from "../src/engine/game-judge";
import { runGameEngine } from "../src/engine/game-runner";
import type { GameArtifact, JudgeReport } from "../src/game/schema";
import { BENCH_BRIEFS } from "./briefs";

const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "bench", "results");

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

const apiKey = process.env.OPENAI_API_KEY ?? "";
if (!DRY && !apiKey) {
  console.error("OPENAI_API_KEY required for a full bench run (or use --dry).");
  process.exit(1);
}

async function loadPlaywright() {
  const mod = process.env.PLAYWRIGHT_MODULE ?? "playwright";
  const pw = await import(mod);
  return pw.chromium ?? pw.default?.chromium;
}

// Prepare an artifact's html for bench execution:
// 1. Inline the vendored Phaser so it runs via setContent without a server.
// 2. Inject a message buffer BEFORE the harness so every harness report
//    is recorded in-page (playwright bindings don't reliably survive
//    setContent navigations, so we poll the buffer instead).
const BENCH_TAP = `<script>
window.__benchBuffer = [];
window.addEventListener("message", function (e) {
  var d = e.data;
  if (d && d.__gameHarness === true && d.type) {
    window.__benchBuffer.push({ type: d.type, payload: d.payload || {} });
  }
});
</script>`;

function prepareBenchHtml(html: string): string {
  const phaser = readFileSync(
    join(ROOT, "public", "vendor", "phaser.min.js"),
    "utf8",
  );
  return html.replace(
    '<script src="/vendor/phaser.min.js"></script>',
    () => `${BENCH_TAP}<script>${phaser}</script>`,
  );
}

type RuntimeLog = {
  ready: boolean;
  errors: string[];
  lastScore: number | null;
  heartbeats: number;
};

type PlaytestResult = { runtime: RuntimeLog; screenshots: string[] };

async function playtest(
  chromium: {
    launch: (opts: object) => Promise<{
      newPage: () => Promise<unknown>;
      close: () => Promise<void>;
    }>;
  },
  html: string,
): Promise<PlaytestResult> {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  // biome-ignore lint/suspicious/noExplicitAny: playwright loaded dynamically; full types unavailable
  const page = (await browser.newPage()) as any;

  const runtime: RuntimeLog = {
    ready: false,
    errors: [],
    lastScore: null,
    heartbeats: 0,
  };
  const captures = new Map<string, string | null>();

  await page.setContent(html, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(2500);

  // Drain the in-page buffer into our runtime log.
  const drain = async () => {
    const events = (await page.evaluate(() => {
      const w = window as unknown as {
        __benchBuffer?: Array<{
          type: string;
          payload: Record<string, unknown>;
        }>;
      };
      return w.__benchBuffer ? w.__benchBuffer.splice(0) : [];
    })) as Array<{ type: string; payload: Record<string, unknown> }>;
    for (const { type, payload } of events) {
      if (type === "ready") runtime.ready = true;
      else if (type === "error" || type === "console.error")
        runtime.errors.push(String(payload.message ?? ""));
      else if (type === "score") runtime.lastScore = Number(payload.score);
      else if (type === "heartbeat") runtime.heartbeats++;
      else if (type === "capture")
        captures.set(
          String(payload.id),
          (payload.dataUrl as string | null) ?? null,
        );
    }
  };

  const send = (msg: Record<string, unknown>) =>
    page.evaluate((m: Record<string, unknown>) => {
      window.postMessage({ __gameParent: true, ...m }, "*");
    }, msg);

  const capture = async (id: string): Promise<string | null> => {
    await send({ type: "capture", id });
    for (let i = 0; i < 40; i++) {
      await drain();
      if (captures.has(id)) return captures.get(id) ?? null;
      await page.waitForTimeout(100);
    }
    return null;
  };

  const screenshots: string[] = [];
  const s1 = await capture("b1");
  if (s1) screenshots.push(s1);
  await send({ type: "fuzz", durationMs: 2200 });
  await page.waitForTimeout(2400);
  const s2 = await capture("b2");
  if (s2) screenshots.push(s2);
  await send({ type: "fuzz", durationMs: 2200 });
  await page.waitForTimeout(2400);
  const s3 = await capture("b3");
  if (s3) screenshots.push(s3);

  await browser.close();
  return { runtime, screenshots };
}

type BenchRow = {
  id: string;
  generated: boolean;
  generationMs: number | null;
  repairs: number | null;
  booted: boolean;
  runtimeErrors: number;
  screenshots: number;
  judge: JudgeReport | null;
  error?: string;
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const chromium = await loadPlaywright();
  const suite = BENCH_BRIEFS.filter((b) => !ONLY || b.id === ONLY);
  const rows: BenchRow[] = [];

  for (const { id, brief } of suite) {
    console.log(`\n=== ${id} ===`);
    const row: BenchRow = {
      id,
      generated: false,
      generationMs: null,
      repairs: null,
      booted: false,
      runtimeErrors: 0,
      screenshots: 0,
      judge: null,
    };
    rows.push(row);

    let artifact: GameArtifact;
    if (DRY) {
      // Mechanics check: use the committed reference artifact.
      const ref = JSON.parse(
        readFileSync(join(ROOT, "bench", "reference-artifact.json"), "utf8"),
      ) as GameArtifact;
      artifact = ref;
      row.generated = true;
      console.log("(dry) using reference artifact");
    } else {
      const gen = await runGameEngine(brief, apiKey);
      if (!gen.ok) {
        row.error = `generation failed: ${gen.error}`;
        console.log(row.error);
        continue;
      }
      artifact = gen.artifact;
      row.generated = true;
      row.generationMs = gen.meta.totalLatencyMs;
      row.repairs = gen.meta.revisionCount;
      console.log(
        `generated "${artifact.title}" in ${(gen.meta.totalLatencyMs / 1000).toFixed(1)}s (${gen.meta.revisionCount} repairs)`,
      );
    }

    try {
      const { runtime, screenshots } = await playtest(
        chromium,
        prepareBenchHtml(artifact.html),
      );
      row.booted = runtime.ready;
      row.runtimeErrors = runtime.errors.length;
      row.screenshots = screenshots.length;
      console.log(
        `playtest: ready=${runtime.ready} errors=${runtime.errors.length} frames=${screenshots.length} score=${runtime.lastScore ?? "-"}`,
      );

      if (!DRY && screenshots.length > 0) {
        const judged = await judgeGame(
          {
            design: artifact.design,
            screenshots,
            runtime: {
              ready: runtime.ready,
              errors: runtime.errors,
              lastScore: runtime.lastScore,
            },
          },
          apiKey,
        );
        if (judged.ok) {
          row.judge = judged.report;
          const s = judged.report.scores;
          console.log(
            `judge: ${judged.report.verdict} | build=${s.buildHealth} visual=${s.visualUsability} fidelity=${s.briefFidelity} learning=${s.learningAlignment}`,
          );
        } else {
          row.error = `judge failed: ${judged.error}`;
        }
      }
    } catch (e) {
      row.error = `playtest failed: ${e instanceof Error ? e.message : e}`;
      console.log(row.error);
    }
  }

  // ---- Report ----
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    join(OUT_DIR, `bench-${stamp}.json`),
    JSON.stringify(rows, null, 2),
  );

  const judged = rows.filter((r) => r.judge);
  const avg = (f: (r: BenchRow) => number) =>
    judged.length
      ? (judged.reduce((s, r) => s + f(r), 0) / judged.length).toFixed(1)
      : "-";
  const md = [
    `# Bench report — ${stamp}`,
    "",
    "| id | gen | repairs | booted | rt errors | frames | verdict | build | visual | fidelity | learning |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) =>
      [
        r.id,
        r.generated
          ? r.generationMs
            ? `${(r.generationMs / 1000).toFixed(0)}s`
            : "dry"
          : "FAIL",
        r.repairs ?? "-",
        r.booted ? "✓" : "✗",
        r.runtimeErrors,
        r.screenshots,
        r.judge?.verdict ?? (r.error ? "ERROR" : "-"),
        r.judge?.scores.buildHealth ?? "-",
        r.judge?.scores.visualUsability ?? "-",
        r.judge?.scores.briefFidelity ?? "-",
        r.judge?.scores.learningAlignment ?? "-",
      ].join(" | "),
    ),
    "",
    `**Aggregates (judged: ${judged.length}/${rows.length})** — build ${avg((r) => r.judge?.scores.buildHealth ?? 0)} · visual ${avg((r) => r.judge?.scores.visualUsability ?? 0)} · fidelity ${avg((r) => r.judge?.scores.briefFidelity ?? 0)} · learning ${avg((r) => r.judge?.scores.learningAlignment ?? 0)}`,
    "",
    ...rows.filter((r) => r.error).map((r) => `- **${r.id}**: ${r.error}`),
  ].join("\n");
  writeFileSync(join(OUT_DIR, `bench-${stamp}.md`), md);
  console.log(`\nreport written to bench/results/bench-${stamp}.{json,md}`);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
