import { repairGame } from "@/engine/game-runner";
import type { GameArtifact } from "@/game/schema";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const RepairRequestSchema = z.object({
  artifact: z.object({
    templateId: z.string(),
    title: z.string(),
    design: z.record(z.string(), z.unknown()),
    code: z.object({ configCode: z.string(), gameCode: z.string() }),
    html: z.string(),
    createdAt: z.number(),
    repairCount: z.number().optional(),
  }),
  errors: z.array(z.string()).min(1).max(20),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RepairRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid repair request", details: parsed.error.flatten() },
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

  // The design passed schema as a loose record; the engine treats it as
  // read-only context for the repair prompt, so the looseness is safe.
  const artifact = parsed.data.artifact as unknown as GameArtifact;

  const result = await repairGame(artifact, parsed.data.errors, apiKey);
  if (!result.ok) {
    console.error(`[game/repair] failed: ${result.error}`);
    return NextResponse.json(
      { error: result.error, meta: result.meta },
      { status: 500 },
    );
  }
  console.info(
    `[game/repair] ok in ${result.meta.totalLatencyMs}ms (repair #${result.artifact.repairCount})`,
  );
  return NextResponse.json({ artifact: result.artifact, meta: result.meta });
}
