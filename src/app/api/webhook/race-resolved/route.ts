import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processRaceResult } from "@/lib/race/result-processor";
import { toBigInt } from "@/lib/validation";
import { serializeBigInt } from "@/lib/utils";

/**
 * Webhook for an external event listener to push RaceResolved notifications.
 * Authenticated with the shared CRON_SECRET. The on-chain result is re-read
 * authoritatively inside processRaceResult - the body is only a trigger.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { raceId?: string | number };
  try {
    body = (await req.json()) as { raceId?: string | number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.raceId === undefined) {
    return NextResponse.json({ error: "raceId is required" }, { status: 400 });
  }

  const raceId = toBigInt(body.raceId);
  const result = await processRaceResult(raceId);

  const match = result.matchId
    ? await prisma.match.findUnique({
        where: { id: result.matchId },
        include: {
          winner: true,
          entries: { include: { user: true }, orderBy: { finishPosition: "asc" } },
        },
      })
    : null;

  return NextResponse.json(serializeBigInt({ result, match }));
}
