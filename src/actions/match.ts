"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeAddress } from "@/lib/users";
import { isManager } from "@/lib/permissions";
import { fetchWalletRaces } from "@/lib/gigaverse/api";
import { linkRaceToMatch, unlinkRace } from "@/lib/race/link-service";
import {
  applyManualHeatResult,
  processRaceResult,
  reopenHeat,
  simulateHeatResult,
} from "@/lib/race/result-processor";
import { toBigInt } from "@/lib/validation";
import type { ActionResult } from "./tournament";
import { getSessionWallet } from "@/lib/auth/session";

async function canActOnMatch(matchId: string, walletAddress: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      entries: { include: { user: true } },
      tournament: { include: { host: true } },
    },
  });
  if (!match) return { match: null, allowed: false };
  const caller = normalizeAddress(walletAddress);
  const allowed =
    isManager(match.tournament, caller) ||
    match.entries.some((e) => e.user.walletAddress === caller);
  return { match, allowed };
}

export async function submitRaceLinkAction(
  matchId: string,
  raceId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const { match, allowed } = await canActOnMatch(matchId, walletAddress);
  if (!match) return { ok: false, error: "Match not found." };
  if (!allowed) {
    return { ok: false, error: "Only match participants or the host can link a race." };
  }

  const result = await linkRaceToMatch(matchId, toBigInt(raceId));
  if (!result.ok) return { ok: false, error: result.message ?? "Link failed" };

  revalidatePath(`/tournaments/${match.tournamentId}/bracket`);
  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`);
  revalidatePath("/"); // landing (Recent Champions)
  revalidatePath("/tournaments"); // browser
  return { ok: true, data: result };
}

/**
 * After a player creates the race on Gigaverse, auto-detect it: read the
 * wallet's recent races, find the newest one not already linked to a heat, and
 * link it to this heat. Saves them copying the race ID by hand.
 */
export async function detectLatestRaceAction(
  matchId: string,
  walletAddress: string
): Promise<ActionResult<{ raceId: string }>> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const { match, allowed } = await canActOnMatch(matchId, walletAddress);
  if (!match) return { ok: false, error: "Match not found." };
  if (!allowed) {
    return { ok: false, error: "Only match participants or the host can link a race." };
  }

  // Newest-first races the wallet created or entered, skipping cancelled ones.
  const races = (await fetchWalletRaces(walletAddress)).filter(
    (r) => r.phase !== 4 // CANCELLED
  );
  if (races.length === 0) {
    const short = `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
    return {
      ok: false,
      error: `No races found for ${short}. Make sure you created the race on Gigaverse with this exact wallet (give it ~30s to index), or paste the race ID below.`,
    };
  }

  // Skip race IDs already linked to a heat (in any competition).
  const ids = races.map((r) => r.raceId);
  const taken = await prisma.match.findMany({
    where: { raceId: { in: ids } },
    select: { raceId: true },
  });
  const takenSet = new Set(taken.map((m) => m.raceId?.toString()));
  const fresh = races.find((r) => !takenSet.has(r.raceId.toString()));
  if (!fresh) {
    return {
      ok: false,
      error: "Your latest race is already linked to a heat. Paste a race ID to link a different one.",
    };
  }

  const result = await linkRaceToMatch(matchId, fresh.raceId);
  if (!result.ok) return { ok: false, error: result.message ?? "Link failed" };

  revalidatePath(`/tournaments/${match.tournamentId}/bracket`);
  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`);
  revalidatePath("/"); // landing (Recent Champions)
  revalidatePath("/tournaments"); // browser
  return { ok: true, data: { raceId: fresh.raceId.toString() } };
}

export async function unlinkRaceAction(
  matchId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const { match, allowed } = await canActOnMatch(matchId, walletAddress);
  if (!match) return { ok: false, error: "Match not found." };
  if (!allowed) return { ok: false, error: "Not authorized." };

  try {
    await unlinkRace(matchId);
    revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

/** Host-only fallback: re-read the linked race and force result processing. */
export async function forceResolveAction(
  matchId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: { include: { host: true } } },
  });
  if (!match) return { ok: false, error: "Match not found." };
  if (!isManager(match.tournament, walletAddress)) {
    return { ok: false, error: "Host or co-hosts only." };
  }
  if (match.raceId === null) {
    return { ok: false, error: "No race linked to this match." };
  }
  const result = await processRaceResult(match.raceId);
  revalidatePath(`/tournaments/${match.tournamentId}/bracket`);
  revalidatePath("/");
  revalidatePath("/tournaments");
  return result.ok
    ? { ok: true, data: result }
    : { ok: false, error: result.message ?? "Could not resolve" };
}

/**
 * Host-only: simulate every open heat to completion (test-mode only). Drives an
 * entire tournament to a champion in one click - ideal for demos.
 */
export async function simulateTournamentAction(
  tournamentId: string,
  walletAddress: string
): Promise<ActionResult<{ simulated: number }>> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  if (!tournament) return { ok: false, error: "Tournament not found." };
  if (!isManager(tournament, walletAddress)) {
    return { ok: false, error: "Host or co-hosts only." };
  }
  if (!tournament.testMode) {
    return { ok: false, error: "Auto-run is only available in test mode." };
  }

  let simulated = 0;
  for (let i = 0; i < 200; i++) {
    const open = await prisma.match.findFirst({
      where: {
        tournamentId,
        status: { in: ["PENDING", "RACE_LINKED", "RACE_OPEN", "RACING"] },
        entries: { some: {} },
      },
      orderBy: [{ round: "asc" }, { position: "asc" }],
    });
    if (!open) break;
    const r = await simulateHeatResult(open.id);
    if (!r.ok) break;
    simulated++;
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath("/");
  revalidatePath("/tournaments");
  return { ok: true, data: { simulated } };
}

/**
 * Host-only: manually set a heat's finishing order (disputes / manual control).
 * `orderedParticipantIds` is best-first.
 */
export async function setHeatResultAction(
  matchId: string,
  walletAddress: string,
  orderedParticipantIds: string[]
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: { include: { host: true } } },
  });
  if (!match) return { ok: false, error: "Heat not found." };
  if (!isManager(match.tournament, walletAddress)) {
    return { ok: false, error: "Host or co-hosts only." };
  }
  const result = await applyManualHeatResult(matchId, orderedParticipantIds);
  revalidatePath(`/tournaments/${match.tournamentId}/bracket`);
  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`);
  revalidatePath("/"); // landing (Recent Champions)
  revalidatePath("/tournaments"); // browser
  return result.ok
    ? { ok: true, data: result }
    : { ok: false, error: result.message ?? "Could not set result" };
}

/** Host-only: reopen a completed heat so it can be re-run. */
export async function reopenHeatAction(
  matchId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: { include: { host: true } } },
  });
  if (!match) return { ok: false, error: "Heat not found." };
  if (!isManager(match.tournament, walletAddress)) {
    return { ok: false, error: "Host or co-hosts only." };
  }
  const result = await reopenHeat(matchId);
  revalidatePath(`/tournaments/${match.tournamentId}/bracket`);
  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`);
  revalidatePath("/"); // landing (Recent Champions)
  revalidatePath("/tournaments"); // browser
  return result.ok
    ? { ok: true, data: result }
    : { ok: false, error: result.message ?? "Could not reopen" };
}

/** Host-only: simulate a heat result (test-mode tournaments only). */
export async function simulateHeatAction(
  matchId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: { include: { host: true } } },
  });
  if (!match) return { ok: false, error: "Heat not found." };
  if (!isManager(match.tournament, walletAddress)) {
    return { ok: false, error: "Host or co-hosts only." };
  }
  const result = await simulateHeatResult(matchId);
  revalidatePath(`/tournaments/${match.tournamentId}/bracket`);
  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`);
  revalidatePath("/"); // landing (Recent Champions)
  revalidatePath("/tournaments"); // browser
  return result.ok
    ? { ok: true, data: result }
    : { ok: false, error: result.message ?? "Could not simulate" };
}
