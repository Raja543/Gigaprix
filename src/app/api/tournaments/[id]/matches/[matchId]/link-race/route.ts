import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { linkRaceToMatch } from "@/lib/race/link-service";
import { linkRaceSchema, toBigInt } from "@/lib/validation";
import { normalizeAddress } from "@/lib/users";
import { serializeBigInt } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string; matchId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id, matchId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = linkRaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  // Authorize: caller must be a heat racer or the tournament host.
  const heat = await prisma.match.findFirst({
    where: { id: matchId, tournamentId: id },
    include: {
      entries: { include: { user: true } },
      tournament: { include: { host: true } },
    },
  });
  if (!heat) {
    return NextResponse.json({ error: "Heat not found" }, { status: 404 });
  }

  const caller = normalizeAddress(parsed.data.walletAddress);
  const authorized =
    caller === heat.tournament.host.walletAddress ||
    heat.entries.some((e) => e.user.walletAddress === caller);
  if (!authorized) {
    return NextResponse.json(
      { error: "Only heat racers or the host can link a race." },
      { status: 403 }
    );
  }

  const result = await linkRaceToMatch(matchId, toBigInt(parsed.data.raceId));
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const updated = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      winner: true,
      entries: { include: { user: true }, orderBy: { finishPosition: "asc" } },
    },
  });
  return NextResponse.json(serializeBigInt({ result, match: updated }));
}
