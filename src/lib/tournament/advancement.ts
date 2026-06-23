import { prisma } from "@/lib/db";

/**
 * Heat-based advancement. A round completes when every heat in it is COMPLETED
 * or BYE. On completion, all advancers (entries flagged `advanced`) are gathered
 * and snake-seeded into the next round's heats. If there is no next round, the
 * final heat's winner is crowned champion.
 *
 * Returns true if the tournament just completed.
 */
export async function advanceRoundIfComplete(
  tournamentId: string,
  round: number
): Promise<boolean> {
  const heats = await prisma.match.findMany({
    where: { tournamentId, round },
    include: { entries: true },
    orderBy: { position: "asc" },
  });
  if (heats.length === 0) return false;

  const allDone = heats.every(
    (h) => h.status === "COMPLETED" || h.status === "BYE"
  );
  if (!allDone) return false;

  const nextRound = round + 1;
  const nextHeats = await prisma.match.findMany({
    where: { tournamentId, round: nextRound },
    orderBy: { position: "asc" },
  });

  // No next round → this was the final. Crown the winner of the final heat.
  if (nextHeats.length === 0) {
    const finalHeat = heats[0];
    const champion =
      finalHeat.winnerId ??
      finalHeat.entries.find((e) => e.finishPosition === 1)?.userId ??
      null;
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        championId: champion,
      },
    });
    return true;
  }

  // Gather advancers across the round, strongest seed first for re-seeding.
  const advancers = heats
    .flatMap((h) => h.entries.filter((e) => e.advanced))
    .sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999));

  // Snake-distribute advancers into the next round's heats.
  const h = nextHeats.length;
  const buckets: {
    participantId: string;
    userId: string;
    petId: bigint | null;
    seed: number | null;
  }[][] = Array.from({ length: h }, () => []);
  advancers.forEach((e, i) => {
    const row = Math.floor(i / h);
    const col = i % h;
    const idx = row % 2 === 0 ? col : h - 1 - col;
    buckets[idx].push({
      participantId: e.participantId,
      userId: e.userId,
      petId: e.petId,
      seed: e.seed,
    });
  });

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < nextHeats.length; i++) {
      const heat = nextHeats[i];
      const entries = buckets[i];
      for (const e of entries) {
        await tx.matchEntry.create({
          data: {
            matchId: heat.id,
            participantId: e.participantId,
            userId: e.userId,
            petId: e.petId,
            seed: e.seed,
          },
        });
      }
      // A next-round heat that received a single racer is a bye.
      if (entries.length === 1) {
        await tx.matchEntry.updateMany({
          where: { matchId: heat.id, participantId: entries[0].participantId },
          data: { advanced: true, finishPosition: 1 },
        });
        await tx.match.update({
          where: { id: heat.id },
          data: {
            status: "BYE",
            winnerId: entries[0].userId,
            winnerPetId: entries[0].petId,
            completedAt: new Date(),
          },
        });
      }
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { currentRound: nextRound },
    });
  });

  // A next round made entirely of byes (rare) should cascade immediately.
  const refreshed = await prisma.match.findMany({
    where: { tournamentId, round: nextRound },
    select: { status: true },
  });
  if (refreshed.every((m) => m.status === "BYE")) {
    return advanceRoundIfComplete(tournamentId, nextRound);
  }

  return false;
}

/**
 * Round-robin league: completes when every heat is done; the rank-1 standing is
 * crowned champion. Returns true if the tournament just completed.
 */
export async function checkLeagueComplete(
  tournamentId: string
): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.format !== "ROUND_ROBIN") return false;
  if (tournament.status === "COMPLETED") return false;

  const remaining = await prisma.match.count({
    where: {
      tournamentId,
      status: { notIn: ["COMPLETED", "BYE", "CANCELLED"] },
    },
  });
  if (remaining > 0) return false;

  const leader = await prisma.standing.findFirst({
    where: { tournamentId },
    orderBy: { rank: "asc" },
  });
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      championId: leader?.userId ?? null,
    },
  });
  return true;
}
