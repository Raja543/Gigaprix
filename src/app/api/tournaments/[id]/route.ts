import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelTournament } from "@/lib/tournament/engine";
import { serializeBigInt } from "@/lib/utils";
import { normalizeAddress } from "@/lib/users";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      host: true,
      participants: { include: { user: true }, orderBy: { seed: "asc" } },
      matches: {
        include: {
          winner: true,
          entries: { include: { user: true }, orderBy: { finishPosition: "asc" } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
      standings: { include: { user: true }, orderBy: { rank: "asc" } },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serializeBigInt({ tournament }));
}

async function assertHost(tournamentId: string, wallet?: string | null) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  if (!tournament) return { ok: false as const, status: 404, error: "Not found" };
  if (
    !wallet ||
    normalizeAddress(wallet) !== tournament.host.walletAddress
  ) {
    return { ok: false as const, status: 403, error: "Host only" };
  }
  return { ok: true as const, tournament };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const wallet = req.headers.get("x-wallet-address");
  const guard = await assertHost(id, wallet);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow safe, presentational fields to be patched.
  const allowed: Record<string, unknown> = {};
  for (const key of [
    "name",
    "description",
    "bannerUrl",
    "accentColor",
    "isPublic",
    "registrationEnd",
  ] as const) {
    if (key in body) allowed[key] = body[key];
  }

  const tournament = await prisma.tournament.update({
    where: { id },
    data: allowed,
  });
  return NextResponse.json(serializeBigInt({ tournament }));
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const wallet = req.headers.get("x-wallet-address");
  const guard = await assertHost(id, wallet);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const tournament = await cancelTournament(id);
  return NextResponse.json(serializeBigInt({ tournament }));
}
