import { runGameEngine } from "@/engine/game-runner";
import type { EngineBrief } from "@/engine/types";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const BriefSchema: z.ZodType<EngineBrief> = z.object({
  topic: z.string(),
  gradeBand: z.string(),
  subject: z.string(),
  learningObjective: z.string(),
  sourceMaterial: z.string().optional(),
  companionType: z.string(),
  durationMinutes: z.number(),
  classroomConstraints: z.string().optional(),
  standards: z.string().optional(),
  tone: z.string().optional(),
  accessibility: z.array(z.string()).optional(),
  similarModules: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BriefSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid brief", details: parsed.error.flatten() },
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

  const result = await runGameEngine(parsed.data, apiKey);
  if (!result.ok) {
    console.error(
      `[game] engine failed with key ${result.meta.keyFingerprint}: ${result.error}`,
    );
    return NextResponse.json(
      { error: result.error, meta: result.meta },
      { status: 500 },
    );
  }
  console.info(
    `[game] engine ok in ${result.meta.totalLatencyMs}ms across ${result.meta.stages.length} stage runs; repairs=${result.meta.revisionCount}`,
  );
  return NextResponse.json({ artifact: result.artifact, meta: result.meta });
}
