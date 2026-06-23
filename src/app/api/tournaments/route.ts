import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/users";
import { createTournament } from "@/lib/tournament/engine";
import { createTournamentSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionWallet } from "@/lib/auth/session";
import { serializeBigInt } from "@/lib/utils";
import type { Prisma, TournamentFormat, TournamentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") as TournamentFormat | null;
  const status = searchParams.get("status") as TournamentStatus | null;
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(48, Number(searchParams.get("pageSize") ?? 12));

  const host = searchParams.get("host");
  const hostLc = host?.toLowerCase();
  let where: Prisma.TournamentWhereInput = { isPublic: true, status: { not: "DRAFT" } };
  if (hostLc) {
    const session = await getSessionWallet();
    const isOwner = session === hostLc;
    const ownedBy = {
      OR: [{ host: { walletAddress: hostLc } }, { coHosts: { has: hostLc } }],
    };
    // The owner sees everything they host/co-host (incl. drafts + private);
    // anyone else only sees that host's public, non-draft competitions.
    where = isOwner
      ? ownedBy
      : { AND: [ownedBy, { isPublic: true, status: { not: "DRAFT" } }] };
  }
  if (format) where.format = format;
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const orderBy: Prisma.TournamentOrderByWithRelationInput =
    sort === "soon"
      ? { registrationEnd: "asc" }
      : sort === "participants"
        ? { participants: { _count: "desc" } }
        : { createdAt: "desc" };

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        host: true,
        _count: { select: { participants: true, matches: true } },
      },
    }),
    prisma.tournament.count({ where }),
  ]);

  return NextResponse.json(
    serializeBigInt({ tournaments, total, page, pageSize })
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { hostAddress, ...config } = parsed.data;

  const rl = rateLimit(`create:${hostAddress.toLowerCase()}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many competitions created. Try again in ${rl.retryAfter}s.` },
      { status: 429 }
    );
  }

  const host = await getOrCreateUser(hostAddress);

  const tournament = await createTournament({ ...config, hostId: host.id });
  return NextResponse.json(serializeBigInt({ tournament }), { status: 201 });
}
