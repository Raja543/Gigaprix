import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser, syncUserElo } from "@/lib/users";
import { registerParticipant } from "@/lib/tournament/engine";
import { checkEligibility } from "@/lib/tournament/eligibility";
import { joinTournamentSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { serializeBigInt } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = joinTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const rl = rateLimit(`join:${parsed.data.walletAddress.toLowerCase()}`, 30, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down." },
      { status: 429 }
    );
  }

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const eligible = await checkEligibility(tournament, parsed.data.walletAddress);
  if (!eligible.ok) {
    return NextResponse.json({ error: eligible.error }, { status: 403 });
  }

  const user = await getOrCreateUser(parsed.data.walletAddress);
  await syncUserElo(user.id, parsed.data.walletAddress).catch(() => {});

  try {
    const participant = await registerParticipant(id, user.id, null);
    return NextResponse.json(serializeBigInt({ participant }), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not join";
    const status = message.includes("full") || message.includes("closed")
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
