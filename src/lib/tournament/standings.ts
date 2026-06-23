import { prisma } from "@/lib/db";

/**
 * Recompute standings to mirror the championship's actual progression. Players
 * are ranked first by how far they advanced (furthest stage reached, then
 * whether they qualified out of it), and only then by points / wins / best time.
 * The crowned champion is always rank 1. Points are still tracked (1st in a heat
 * = heatSize pts, 2nd = heatSize-1, …) and used as a tiebreaker.
 */
export async function calculateStandings(tournamentId: string): Promise<void> {
  const [tournament, participants, heats] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.participant.findMany({
      where: { tournamentId },
      include: { user: true },
    }),
    prisma.match.findMany({
      where: { tournamentId, status: "COMPLETED" },
      include: { entries: true },
    }),
  ]);
  if (!tournament) return;
  const base = tournament.heatSize;

  interface Acc {
    userId: string;
    walletAddress: string;
    wins: number;
    racesPlayed: number;
    points: number;
    bestTime: bigint | null;
    streak: number;
    lastWasWin: boolean;
    maxRound: number; // furthest stage the player appeared in
    advancedAtMax: boolean; // qualified out of that furthest stage
  }

  const acc = new Map<string, Acc>();
  for (const p of participants) {
    acc.set(p.userId, {
      userId: p.userId,
      walletAddress: p.user.walletAddress,
      wins: 0,
      racesPlayed: 0,
      points: 0,
      bestTime: null,
      streak: 0,
      lastWasWin: false,
      maxRound: 0,
      advancedAtMax: false,
    });
  }

  for (const heat of heats) {
    for (const e of heat.entries) {
      const a = acc.get(e.userId);
      if (!a) continue;

      // Track progression even for heats without a recorded finish position.
      if (heat.round > a.maxRound) {
        a.maxRound = heat.round;
        a.advancedAtMax = e.advanced;
      } else if (heat.round === a.maxRound && e.advanced) {
        a.advancedAtMax = true;
      }

      if (e.finishPosition === null) continue;
      a.racesPlayed++;
      a.points += Math.max(1, base - (e.finishPosition - 1));
      if (e.finishPosition === 1) {
        a.wins++;
        a.streak = a.lastWasWin ? a.streak + 1 : 1;
        a.lastWasWin = true;
      } else {
        a.lastWasWin = false;
      }
      if (e.finishTime !== null) {
        a.bestTime =
          a.bestTime === null || e.finishTime < a.bestTime
            ? e.finishTime
            : a.bestTime;
      }
    }
  }

  const championId = tournament.championId;
  const ranked = [...acc.values()].sort((x, y) => {
    // Champion is always first.
    if (championId) {
      if (x.userId === championId) return -1;
      if (y.userId === championId) return 1;
    }
    // Furthest stage reached, then qualified-out-of-it.
    if (y.maxRound !== x.maxRound) return y.maxRound - x.maxRound;
    if (x.advancedAtMax !== y.advancedAtMax) return x.advancedAtMax ? -1 : 1;
    // Then competition points, heat wins, best time.
    if (y.points !== x.points) return y.points - x.points;
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (x.bestTime !== null && y.bestTime !== null && x.bestTime !== y.bestTime) {
      return x.bestTime < y.bestTime ? -1 : 1;
    }
    if (x.bestTime === null) return 1;
    if (y.bestTime === null) return -1;
    return 0;
  });

  await prisma.$transaction(
    ranked.map((s, i) =>
      prisma.standing.upsert({
        where: { tournamentId_userId: { tournamentId, userId: s.userId } },
        create: {
          tournamentId,
          userId: s.userId,
          walletAddress: s.walletAddress,
          wins: s.wins,
          racesPlayed: s.racesPlayed,
          points: s.points,
          bestTime: s.bestTime,
          streak: s.streak,
          rank: i + 1,
        },
        update: {
          wins: s.wins,
          racesPlayed: s.racesPlayed,
          points: s.points,
          bestTime: s.bestTime,
          streak: s.streak,
          rank: i + 1,
        },
      })
    )
  );
}
