import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRacePhase } from "@/lib/gigaverse/contracts";
import { processRaceResult } from "@/lib/race/result-processor";
import { RacePhase } from "@/types/gigaverse";
import { serializeBigInt } from "@/lib/utils";
import { captureError } from "@/lib/monitoring";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron (every minute). Polls on-chain phase for every match with a
 * pending linked race and reconciles state:
 *   RESOLVED  → process result + advance bracket / standings
 *   CANCELLED → mark match cancelled, clear link so it can be re-linked
 *   otherwise → store the latest phase for live display
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isProd = process.env.NODE_ENV === "production";

  // In production the cron MUST be protected; refuse to run wide open.
  if (isProd && !secret) {
    return NextResponse.json(
      { error: "Cron not configured (set CRON_SECRET)" },
      { status: 503 }
    );
  }
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: {
      raceId: { not: null },
      status: { in: ["RACE_LINKED", "RACE_OPEN", "RACING"] },
    },
    take: 100,
  });

  const summary = {
    checked: matches.length,
    resolved: 0,
    cancelled: 0,
    updated: 0,
    errors: 0,
  };

  for (const match of matches) {
    if (match.raceId === null) continue;
    try {
      const phase = await getRacePhase(match.raceId);

      if (phase === RacePhase.RESOLVED) {
        const result = await processRaceResult(match.raceId);
        if (result.ok) summary.resolved++;
        else summary.errors++;
      } else if (phase === RacePhase.CANCELLED) {
        await prisma.match.update({
          where: { id: match.id },
          data: { status: "CANCELLED", racePhase: phase },
        });
        summary.cancelled++;
      } else {
        const status =
          phase === RacePhase.RESOLVING
            ? "RACING"
            : phase === RacePhase.OPEN
              ? "RACE_OPEN"
              : match.status;
        await prisma.match.update({
          where: { id: match.id },
          data: { racePhase: phase, status },
        });
        summary.updated++;
      }
    } catch (err) {
      captureError(err, { cron: "sync-races", matchId: match.id });
      summary.errors++;
    }
  }

  // If anything changed, refresh the public listings so completed/updated
  // competitions surface without a manual reload.
  if (summary.resolved || summary.cancelled || summary.updated) {
    revalidatePath("/");
    revalidatePath("/tournaments");
  }

  return NextResponse.json(serializeBigInt({ ok: true, ...summary }));
}

// Allow manual POST triggering with the same auth.
export const POST = GET;
