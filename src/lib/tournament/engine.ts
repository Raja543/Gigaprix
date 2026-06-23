import { prisma } from "@/lib/db";
import type { CreateTournamentConfig } from "@/types/tournament";
import { distanceForRaceType } from "@/lib/competition";
import {
  generateHeatBracket,
  type HeatPlan,
  type SeededParticipant,
} from "./single-elimination";
import { generateHeatLeague } from "./round-robin";
import { calculateStandings } from "./standings";

export async function createTournament(config: CreateTournamentConfig) {
  const raceType = config.raceType ?? "SPRINT";
  return prisma.tournament.create({
    data: {
      name: config.name,
      description: config.description,
      format: config.format ?? "SINGLE_ELIMINATION",
      competitionType: config.competitionType ?? "CHAMPIONSHIP",
      raceType,
      status: "REGISTRATION",
      maxParticipants: config.maxParticipants,
      heatSize: config.heatSize ?? 8,
      advanceCount: config.advanceCount ?? 4,
      advancePerRound: config.advancePerRound ?? [],
      testMode: config.testMode ?? false,
      whitelistEnabled: config.whitelistEnabled ?? false,
      maxPerWallet: config.maxPerWallet ?? 1,
      // Track length is derived from the race-type preset.
      trackLength: distanceForRaceType(raceType),
      itemsMode: config.itemsMode ?? 0,
      weatherMode: config.weatherMode ?? null,
      factionMode: config.factionMode ?? null,
      bannerUrl: config.bannerUrl ?? null,
      accentColor: config.accentColor ?? null,
      isPublic: config.isPublic ?? true,
      registrationStart: config.registrationStart ?? null,
      registrationEnd: config.registrationEnd ?? null,
      hostId: config.hostId,
    },
  });
}

export async function registerParticipant(
  tournamentId: string,
  userId: string,
  petId?: bigint | null
) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { participants: true } } },
  });
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "REGISTRATION") throw new Error("Registration is closed");
  if (tournament._count.participants >= tournament.maxParticipants) {
    throw new Error("Tournament is full");
  }

  const walletEntries = await prisma.participant.count({
    where: { tournamentId, userId },
  });
  if (walletEntries >= tournament.maxPerWallet) {
    throw new Error(
      tournament.maxPerWallet === 1
        ? "You have already joined this tournament"
        : `Wallet entry limit reached (max ${tournament.maxPerWallet})`
    );
  }

  if (petId != null) {
    const dupe = await prisma.participant.findFirst({
      where: { tournamentId, petId },
    });
    if (dupe) throw new Error("That gigling is already entered in this tournament");
  }

  const participant = await prisma.participant.create({
    data: { tournamentId, userId, petId: petId ?? null },
  });

  // Auto-start the bracket once the roster is full.
  if (tournament._count.participants + 1 >= tournament.maxParticipants) {
    try {
      await startTournament(tournamentId);
    } catch {
      // leave in REGISTRATION if start fails (host can start manually)
    }
  }

  return participant;
}

/**
 * Seed participants (ELO desc, registration order fallback), generate the heat
 * structure, persist heats + round-1 entries, and transition to IN_PROGRESS.
 */
export async function startTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: { include: { user: true } } },
  });
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "REGISTRATION") {
    throw new Error("Tournament cannot be started from its current status");
  }
  if (tournament.participants.length < 2) {
    throw new Error("Need at least 2 participants to start");
  }

  const ordered = [...tournament.participants].sort((a, b) => {
    const ea = a.user.elo ?? 0;
    const eb = b.user.elo ?? 0;
    if (eb !== ea) return eb - ea;
    return a.registeredAt.getTime() - b.registeredAt.getTime();
  });
  const seeded: SeededParticipant[] = ordered.map((p, i) => ({
    participantId: p.id,
    userId: p.userId,
    petId: p.petId,
    seed: i + 1,
  }));

  await prisma.$transaction(
    seeded.map((s) =>
      prisma.participant.update({
        where: { id: s.participantId },
        data: { seed: s.seed },
      })
    )
  );

  const advance =
    tournament.advancePerRound.length > 0
      ? tournament.advancePerRound
      : tournament.advanceCount;
  const { heats, totalRounds } =
    tournament.format === "SINGLE_ELIMINATION"
      ? generateHeatBracket(seeded, tournament.heatSize, advance)
      : generateHeatLeague(seeded, tournament.heatSize);

  await persistHeats(tournamentId, heats);

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
      totalRounds,
      currentRound: 1,
    },
  });

  // Seed empty standings so the table renders immediately.
  await calculateStandings(tournamentId);
}

/** Create Match (heat) rows and their entries; auto-resolve round-1 byes. */
async function persistHeats(tournamentId: string, heats: HeatPlan[]) {
  for (const heat of heats) {
    const isBye = heat.status === "BYE";
    const only = heat.entries[0];
    await prisma.match.create({
      data: {
        tournamentId,
        round: heat.round,
        position: heat.position,
        heatSize: heat.entries.length || 8,
        advanceCount: heat.advanceCount,
        status: heat.status,
        completedAt: isBye ? new Date() : null,
        winnerId: isBye ? only?.userId ?? null : null,
        winnerPetId: isBye ? only?.petId ?? null : null,
        entries: {
          create: heat.entries.map((e) => ({
            participantId: e.participantId,
            userId: e.userId,
            petId: e.petId,
            seed: e.seed,
            advanced: isBye,
            finishPosition: isBye ? 1 : null,
          })),
        },
      },
    });
  }
}

export async function cancelTournament(tournamentId: string) {
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "CANCELLED" },
  });
}
