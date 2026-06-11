import { judgeGame } from "@/engine/game-judge";
import type { GameDesign } from "@/game/schema";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const DATA_URL_RE = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_BYTES = 400_000;

const JudgeRequestSchema = z.object({
  design: z.record(z.string(), z.unknown()),
  screenshots: z
    .array(
      z
        .string()
        .regex(DATA_URL_RE, "screenshots must be base64 jpeg/png data URLs")
        .max(MAX_IMAGE_BYTES),
    )
    .min(1)
    .max(4),
  runtime: z.object({
    ready: z.boolean(),
    errors: z.array(z.string()).max(10),
    lastScore: z.number().nullable(),
  }),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = JudgeRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid judge request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  const result = await judgeGame(
    {
      design: parsed.data.design as unknown as GameDesign,
      screenshots: parsed.data.screenshots,
      runtime: parsed.data.runtime,
    },
    apiKey,
  );
  if (!result.ok) {
    console.error(`[game/judge] failed: ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  console.info(
    `[game/judge] verdict=${result.report.verdict} in ${result.latencyMs}ms`,
  );
  return NextResponse.json({ report: result.report });
}
