import { prisma } from "@/lib/db";
import {
  getPetOwnerInRace,
  getRaceFinalRanking,
  getRaceFinishTimes,
} from "@/lib/gigaverse/contracts";
import {
  advanceRoundIfComplete,
  checkLeagueComplete,
} from "@/lib/tournament/advancement";
import { calculateStandings } from "@/lib/tournament/standings";
import { normalizeAddress } from "@/lib/users";
import type { ProcessResult } from "@/types/match";

/**
 * Process a resolved race for the heat it backs:
 *  1. Read the full final ranking + finish times on-chain.
 *  2. For each pet, resolve its owner (getPetOwnerInRace) and match it to a heat
 *     entry by wallet - this captures the exact gigling each player raced.
 *  3. Rank the matched entries, record finish position/time, flag the top
 *     `advanceCount` as advanced, and set the heat winner (1st place).
 *  4. Advance the round (SE) or recompute standings (RR), then check completion.
 */
export async function processRaceResult(raceId: bigint): Promise<ProcessResult> {
  const heat = await prisma.match.findFirst({
    where: { raceId },
    include: {
      entries: { include: { user: true } },
      tournament: true,
    },
  });
  if (!heat) {
    return {
      ok: false,
      tournamentCompleted: false,
      message: `No heat linked to race ${raceId}.`,
    };
  }
  if (heat.status === "COMPLETED") {
    return {
      ok: true,
      matchId: heat.id,
      winnerId: heat.winnerId,
      tournamentCompleted: false,
      message: "Heat already processed.",
    };
  }

  let ranking: bigint[];
  let times: bigint[];
  try {
    [ranking, times] = await Promise.all([
      getRaceFinalRanking(raceId),
      getRaceFinishTimes(raceId),
    ]);
  } catch {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "Could not read race result on-chain yet.",
    };
  }
  if (ranking.length === 0) {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "Race has no final ranking yet.",
    };
  }

  const rankByPet = new Map<string, number>();
  ranking.forEach((petId, i) => rankByPet.set(petId.toString(), i));
  const timeByPet = new Map<string, bigint>();
  ranking.forEach((petId, i) => {
    if (times[i] !== undefined) timeByPet.set(petId.toString(), times[i]);
  });

  // Resolve each entry's gigling: use its registered petId if present, otherwise
  // map an unclaimed race pet to the entry's wallet (single-gigling flow).
  type Resolved = {
    entryId: string;
    participantId: string;
    userId: string;
    petId: bigint;
    rank: number;
    time: bigint | null;
  };
  const resolved: Resolved[] = [];
  const claimedPets = new Set<string>();

  for (const e of heat.entries) {
    if (e.petId != null && rankByPet.has(e.petId.toString())) {
      const key = e.petId.toString();
      claimedPets.add(key);
      resolved.push({
        entryId: e.id,
        participantId: e.participantId,
        userId: e.userId,
        petId: e.petId,
        rank: rankByPet.get(key)!,
        time: timeByPet.get(key) ?? null,
      });
    }
  }

  // Owner-based fallback for entries without a registered gigling.
  const unresolved = heat.entries.filter(
    (e) => !resolved.some((r) => r.entryId === e.id)
  );
  if (unresolved.length > 0) {
    const walletToEntries = new Map<string, typeof unresolved>();
    for (const e of unresolved) {
      const w = normalizeAddress(e.user.walletAddress);
      const list = walletToEntries.get(w) ?? [];
      list.push(e);
      walletToEntries.set(w, list);
    }
    for (const petId of ranking) {
      const key = petId.toString();
      if (claimedPets.has(key)) continue;
      let owner: string;
      try {
        owner = normalizeAddress(await getPetOwnerInRace(raceId, petId));
      } catch {
        continue;
      }
      const list = walletToEntries.get(owner);
      const e = list?.shift();
      if (!e) continue;
      claimedPets.add(key);
      resolved.push({
        entryId: e.id,
        participantId: e.participantId,
        userId: e.userId,
        petId,
        rank: rankByPet.get(key)!,
        time: timeByPet.get(key) ?? null,
      });
    }
  }

  if (resolved.length === 0) {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message:
        "None of this heat's racers were found in the race. Check the race ID.",
    };
  }

  resolved.sort((a, b) => a.rank - b.rank);
  const advanceCount = heat.advanceCount;
  const winner = resolved[0];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      await tx.matchEntry.update({
        where: { id: r.entryId },
        data: {
          petId: r.petId,
          finishPosition: i + 1,
          finishTime: r.time,
          advanced: i < advanceCount,
        },
      });
    }
    await tx.match.update({
      where: { id: heat.id },
      data: {
        status: "COMPLETED",
        racePhase: 3,
        winnerId: winner.userId,
        winnerPetId: winner.petId,
        finalRanking: ranking.map((r) => r.toString()),
        completedAt: new Date(),
      },
    });
  });

  // Mark non-advancers eliminated (single elimination only).
  if (heat.tournament.format === "SINGLE_ELIMINATION") {
    const eliminated = resolved.slice(advanceCount).map((r) => r.participantId);
    if (eliminated.length > 0) {
      await prisma.participant.updateMany({
        where: { id: { in: eliminated } },
        data: { isEliminated: true },
      });
    }
  }

  await calculateStandings(heat.tournamentId);

  let tournamentCompleted = false;
  if (heat.tournament.format === "SINGLE_ELIMINATION") {
    tournamentCompleted = await advanceRoundIfComplete(
      heat.tournamentId,
      heat.round
    );
  } else {
    tournamentCompleted = await checkLeagueComplete(heat.tournamentId);
  }

  return {
    ok: true,
    matchId: heat.id,
    winnerId: winner.userId,
    tournamentCompleted,
    message: `Heat resolved - ${resolved.length} racers placed.`,
  };
}

/**
 * Finalize a heat given an explicit finishing order (entry IDs, best first).
 * Shared by simulate (random order) and manual host override. Assigns
 * positions/times, advances the top N, and updates standings + bracket.
 */
async function finalizeHeatOrder(
  heatId: string,
  orderedEntryIds: string[],
  label: string
): Promise<ProcessResult> {
  const heat = await prisma.match.findUnique({
    where: { id: heatId },
    include: { entries: true, tournament: true },
  });
  if (!heat) {
    return { ok: false, tournamentCompleted: false, message: "Heat not found." };
  }
  if (heat.status === "COMPLETED" || heat.status === "BYE") {
    return {
      ok: true,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "Heat already resolved.",
    };
  }
  if (heat.entries.length === 0) {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "This heat has no racers yet.",
    };
  }

  const byId = new Map(heat.entries.map((e) => [e.id, e]));
  const order = orderedEntryIds
    .map((id) => byId.get(id))
    .filter((e): e is NonNullable<typeof e> => !!e);
  if (order.length !== heat.entries.length) {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "The submitted order doesn't match this heat's racers.",
    };
  }

  const advanceCount = heat.advanceCount;
  const winner = order[0];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx.matchEntry.update({
        where: { id: order[i].id },
        data: {
          finishPosition: i + 1,
          finishTime: BigInt(11500 + i * 240 + Math.floor(Math.random() * 120)),
          advanced: i < advanceCount,
        },
      });
    }
    await tx.match.update({
      where: { id: heat.id },
      data: {
        status: "COMPLETED",
        winnerId: winner.userId,
        winnerPetId: winner.petId,
        finalRanking: order.map((e) => e.petId?.toString() ?? "0"),
        completedAt: new Date(),
      },
    });
  });

  if (heat.tournament.format === "SINGLE_ELIMINATION") {
    const eliminated = order.slice(advanceCount).map((e) => e.participantId);
    if (eliminated.length > 0) {
      await prisma.participant.updateMany({
        where: { id: { in: eliminated } },
        data: { isEliminated: true },
      });
    }
  }

  await calculateStandings(heat.tournamentId);

  const tournamentCompleted =
    heat.tournament.format === "SINGLE_ELIMINATION"
      ? await advanceRoundIfComplete(heat.tournamentId, heat.round)
      : await checkLeagueComplete(heat.tournamentId);

  return {
    ok: true,
    matchId: heat.id,
    winnerId: winner.userId,
    tournamentCompleted,
    message: `${label} - ${order.length} racers placed.`,
  };
}

/**
 * Test-mode resolver: assign a random finishing order to a heat WITHOUT a real
 * on-chain race. Only allowed when the tournament has testMode enabled.
 */
export async function simulateHeatResult(heatId: string): Promise<ProcessResult> {
  const heat = await prisma.match.findUnique({
    where: { id: heatId },
    include: { entries: true, tournament: true },
  });
  if (!heat) {
    return { ok: false, tournamentCompleted: false, message: "Heat not found." };
  }
  if (!heat.tournament.testMode) {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "Simulation is only available in test-mode tournaments.",
    };
  }
  const ids = heat.entries.map((e) => e.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return finalizeHeatOrder(heatId, ids, "Simulated");
}

/**
 * Reopen a completed heat so it can be re-run (host fix for a wrong result).
 * Safe scope: for single-elimination this is only allowed while the heat's round
 * hasn't fully advanced yet (no later-round entries exist), so there's no
 * downstream bracket to unwind. Round-robin heats can always be reopened.
 */
export async function reopenHeat(heatId: string): Promise<ProcessResult> {
  const heat = await prisma.match.findUnique({
    where: { id: heatId },
    include: { entries: true, tournament: true },
  });
  if (!heat) {
    return { ok: false, tournamentCompleted: false, message: "Heat not found." };
  }
  if (heat.status !== "COMPLETED") {
    return {
      ok: false,
      matchId: heat.id,
      tournamentCompleted: false,
      message: "Only a completed heat can be reopened.",
    };
  }

  if (heat.tournament.format === "SINGLE_ELIMINATION") {
    const downstream = await prisma.matchEntry.count({
      where: { match: { tournamentId: heat.tournamentId, round: { gt: heat.round } } },
    });
    if (downstream > 0) {
      return {
        ok: false,
        matchId: heat.id,
        tournamentCompleted: false,
        message:
          "Can't reopen - later rounds are already seeded. Reopen the latest round first.",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.matchEntry.updateMany({
      where: { matchId: heat.id },
      data: { finishPosition: null, finishTime: null, advanced: false },
    });
    await tx.match.update({
      where: { id: heat.id },
      data: {
        status: "PENDING",
        winnerId: null,
        winnerPetId: null,
        raceId: null,
        racePhase: null,
        finalRanking: undefined,
        completedAt: null,
      },
    });
    // Un-eliminate this heat's racers (they're back in contention).
    await tx.participant.updateMany({
      where: { id: { in: heat.entries.map((e) => e.participantId) } },
      data: { isEliminated: false },
    });
  });

  // Roll the tournament back to in-progress if it had completed.
  const open = await prisma.match.findFirst({
    where: {
      tournamentId: heat.tournamentId,
      status: { notIn: ["COMPLETED", "BYE", "CANCELLED"] },
    },
    orderBy: { round: "asc" },
  });
  await prisma.tournament.update({
    where: { id: heat.tournamentId },
    data: {
      status: "IN_PROGRESS",
      championId: null,
      completedAt: null,
      currentRound: open?.round ?? heat.round,
    },
  });

  await calculateStandings(heat.tournamentId);

  return {
    ok: true,
    matchId: heat.id,
    tournamentCompleted: false,
    message: "Heat reopened - set a new result when ready.",
  };
}

/**
 * Host manual override: set a heat's finishing order explicitly (for disputes
 * or manual management). `orderedParticipantIds` is best-first.
 */
export async function applyManualHeatResult(
  heatId: string,
  orderedParticipantIds: string[]
): Promise<ProcessResult> {
  const heat = await prisma.match.findUnique({
    where: { id: heatId },
    include: { entries: true },
  });
  if (!heat) {
    return { ok: false, tournamentCompleted: false, message: "Heat not found." };
  }
  const entryByParticipant = new Map(
    heat.entries.map((e) => [e.participantId, e.id])
  );
  const orderedEntryIds = orderedParticipantIds
    .map((pid) => entryByParticipant.get(pid))
    .filter((x): x is string => !!x);
  return finalizeHeatOrder(heatId, orderedEntryIds, "Result set");
}
