"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateUser, syncUserElo } from "@/lib/users";
import {
  cancelTournament as cancelTournamentEngine,
  createTournament as createTournamentEngine,
  registerParticipant,
  startTournament as startTournamentEngine,
} from "@/lib/tournament/engine";
import { checkEligibility } from "@/lib/tournament/eligibility";
import { planRounds } from "@/lib/tournament/single-elimination";
import { distanceForRaceType } from "@/lib/competition";
import { captureError } from "@/lib/monitoring";
import { isManager, isPrimaryHost } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { createTournamentSchema, walletSchema } from "@/lib/validation";
import { getSessionWallet } from "@/lib/auth/session";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createTournamentAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const caller = await getSessionWallet();
  if (!caller) {
    return { ok: false, error: "Sign in with your wallet to continue." };
  }
  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  // Host is always the authenticated wallet, never a client-supplied address.
  const { ...config } = parsed.data;

  const rl = rateLimit(`create:${caller}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many competitions created. Try again in ${rl.retryAfter}s.`,
    };
  }

  try {
    const host = await getOrCreateUser(caller);
    const tournament = await createTournamentEngine({ ...config, hostId: host.id });
    revalidatePath("/tournaments");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: tournament.id } };
  } catch (err) {
    captureError(err, { action: "createTournament", caller });
    const detail = err instanceof Error ? err.message.split("\n")[0] : "";
    return {
      ok: false,
      error: `Could not create the competition${detail ? ` (${detail})` : ""}. Check your database connection.`,
    };
  }
}

export async function joinTournamentAction(
  tournamentId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  try {
    const rl = rateLimit(`join:${walletAddress.toLowerCase()}`, 30, 60 * 1000);
    if (!rl.ok) {
      return { ok: false, error: "Slow down a moment and try again." };
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) return { ok: false, error: "Competition not found" };

    const eligible = await checkEligibility(tournament, walletAddress);
    if (!eligible.ok) return { ok: false, error: eligible.error ?? "Not eligible" };

    const user = await getOrCreateUser(walletAddress);
    // Pull the wallet's real best-gigling ELO for seeding + display.
    await syncUserElo(user.id, walletAddress).catch(() => {});
    await registerParticipant(tournamentId, user.id, null);
    revalidatePath(`/tournaments/${tournamentId}`);
    return { ok: true, data: null };
  } catch (err) {
    captureError(err, { action: "joinTournament", tournamentId, walletAddress });
    return { ok: false, error: err instanceof Error ? err.message : "Failed to join" };
  }
}

/**
 * Heuristic: an obviously-synthetic test wallet (e.g. `0x0000…`, `0x1111…`, or
 * `0xdead…`) that won't have Gigaverse race data — skip the slow ELO lookup for
 * these so filling a test competition is fast.
 */
function isPlaceholderWallet(address: string): boolean {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (hex.length !== 40) return false;
  // All-same-character (0x0000…, 0xffff…, 0x1111…) → clearly fake.
  if (/^(.)\1{39}$/.test(hex)) return true;
  // Mostly-zero padding with a short suffix (0x000…0001) → clearly fake.
  if (/^0{30,}/.test(hex)) return true;
  return false;
}

/** Host-only: bulk-register wallets (useful for filling a test tournament). */
export async function addParticipantsAction(
  tournamentId: string,
  hostAddress: string,
  addresses: string[]
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  hostAddress = __caller;
  if (!(await isManagerOf(tournamentId, hostAddress))) {
    return { ok: false, error: "Only the host or co-hosts can add participants." };
  }
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { participants: true } } },
  });
  if (!tournament) return { ok: false, error: "Competition not found" };

  const remaining = tournament.maxParticipants - tournament._count.participants;
  let skipped = 0;

  // Validate + de-dupe (within the input) up front, then respect the racer cap.
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const raw of addresses) {
    const parsed = walletSchema.safeParse(raw.trim());
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const wallet = parsed.data.toLowerCase();
    if (seen.has(wallet)) {
      skipped++;
      continue;
    }
    seen.add(wallet);
    if (valid.length >= remaining) {
      skipped++;
      continue;
    }
    valid.push(parsed.data);
  }

  // Bulk add concurrently (no auto-start) so the host stays in control of when
  // the stages generate. Each wallet: upsert user → skip if already a
  // participant → create. The Gigaverse ELO sync is the slow part (a network
  // call per wallet), so we (a) skip it for placeholder test wallets and (b) run
  // every wallet in parallel instead of one-at-a-time.
  const results = await Promise.all(
    valid.map(async (address) => {
      try {
        const user = await getOrCreateUser(address);
        const exists = await prisma.participant.findFirst({
          where: { tournamentId, userId: user.id },
          select: { id: true },
        });
        if (exists) return false;
        await prisma.participant.create({
          data: { tournamentId, userId: user.id },
        });
        // Best-effort real ELO so seeding + lists are accurate — but don't waste
        // a 6s Gigaverse lookup on obvious placeholder/test wallets.
        if (!isPlaceholderWallet(address)) {
          await syncUserElo(user.id, address).catch(() => {});
        }
        return true;
      } catch {
        return null; // signal failure → counts as skipped
      }
    })
  );

  const added = results.filter((r) => r === true).length;
  skipped += results.filter((r) => r !== true).length;

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  return { ok: true, data: { added, skipped } };
}

/** Host-only: add wallets to the tournament whitelist. */
export async function updateWhitelistAction(
  tournamentId: string,
  hostAddress: string,
  add: string[],
  remove: string[] = []
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  hostAddress = __caller;
  if (!(await isManagerOf(tournamentId, hostAddress))) {
    return { ok: false, error: "Only the host or co-hosts can manage the whitelist." };
  }
  for (const raw of add) {
    const parsed = walletSchema.safeParse(raw.trim());
    if (!parsed.success) continue;
    const wallet = parsed.data.toLowerCase();
    await prisma.whitelistEntry.upsert({
      where: { tournamentId_walletAddress: { tournamentId, walletAddress: wallet } },
      create: { tournamentId, walletAddress: wallet },
      update: {},
    });
  }
  for (const raw of remove) {
    const wallet = raw.trim().toLowerCase();
    await prisma.whitelistEntry.deleteMany({
      where: { tournamentId, walletAddress: wallet },
    });
  }
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, data: null };
}

async function isManagerOf(tournamentId: string, walletAddress: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  return !!t && isManager(t, walletAddress);
}

async function isPrimaryHostOf(tournamentId: string, walletAddress: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  return !!t && isPrimaryHost(t, walletAddress);
}

export async function startTournamentAction(
  tournamentId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  if (!(await isManagerOf(tournamentId, walletAddress))) {
    return { ok: false, error: "Only the host or co-hosts can start this competition." };
  }
  try {
    await startTournamentEngine(tournamentId);
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/bracket`);
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to start" };
  }
}

export interface TournamentPatch {
  name?: string;
  description?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  isPublic?: boolean;
  // Pre-start only:
  competitionType?: "CHAMPIONSHIP" | "CREATOR_CUP" | "COMMUNITY_CUP" | "GUILD_CUP";
  raceType?: "DASH" | "SPRINT" | "MARATHON" | "GRAND_PRIX";
  maxParticipants?: number;
  heatSize?: number;
  advanceCount?: number;
  testMode?: boolean;
  whitelistEnabled?: boolean;
  maxPerWallet?: number;
}

/** Host-only edit. Rules fields are only editable before the tournament starts. */
export async function updateTournamentAction(
  tournamentId: string,
  walletAddress: string,
  patch: TournamentPatch
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true, _count: { select: { participants: true } } },
  });
  if (!tournament) return { ok: false, error: "Tournament not found" };
  if (!isManager(tournament, walletAddress)) {
    return { ok: false, error: "Only the host or co-hosts can edit this competition." };
  }

  const preStart =
    tournament.status === "DRAFT" || tournament.status === "REGISTRATION";

  // Presentational fields - editable anytime.
  const data: Record<string, unknown> = {};
  for (const k of ["name", "description", "bannerUrl", "accentColor", "isPublic"] as const) {
    if (patch[k] !== undefined) data[k] = patch[k];
  }

  // Rules - only before start.
  if (preStart) {
    for (const k of [
      "competitionType",
      "heatSize",
      "advanceCount",
      "testMode",
      "whitelistEnabled",
      "maxPerWallet",
    ] as const) {
      if (patch[k] !== undefined) data[k] = patch[k];
    }
    if (patch.raceType !== undefined) {
      data.raceType = patch.raceType;
      data.trackLength = distanceForRaceType(patch.raceType);
    }
    if (patch.maxParticipants !== undefined) {
      if (patch.maxParticipants < tournament._count.participants) {
        return {
          ok: false,
          error: `Max participants can't be below current count (${tournament._count.participants}).`,
        };
      }
      data.maxParticipants = patch.maxParticipants;
    }
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  await prisma.tournament.update({ where: { id: tournamentId }, data });
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/edit`);
  return { ok: true, data: null };
}

/**
 * Host-only: change how many advance from a round mid-tournament, then
 * regenerate the (empty) downstream rounds. Only allowed on a round whose heats
 * are all still PENDING (none run yet) - so no results are invalidated.
 */
export async function setRoundAdvanceCountAction(
  tournamentId: string,
  walletAddress: string,
  round: number,
  newCount: number
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  if (!tournament) return { ok: false, error: "Tournament not found" };
  if (!isManager(tournament, walletAddress)) {
    return { ok: false, error: "Only the host or co-hosts can change qualifiers." };
  }
  if (tournament.format !== "SINGLE_ELIMINATION") {
    return { ok: false, error: "Per-round qualifiers apply to single elimination only." };
  }
  if (round >= tournament.totalRounds) {
    return { ok: false, error: "The final round has no cutoff to change." };
  }

  const roundHeats = await prisma.match.findMany({
    where: { tournamentId, round },
    include: { entries: { select: { id: true } } },
  });
  if (roundHeats.length === 0) return { ok: false, error: "Round not found." };
  if (roundHeats.some((h) => h.status !== "PENDING")) {
    return { ok: false, error: "This round has already started - set its cutoff before any heat runs." };
  }
  const totalEntries = roundHeats.reduce((s, h) => s + h.entries.length, 0);
  if (totalEntries === 0) {
    return { ok: false, error: "This round isn't active yet." };
  }

  const H = tournament.heatSize;
  const newC = Math.min(Math.max(1, newCount), H - 1);

  const downstreamEntries = await prisma.matchEntry.count({
    where: { match: { tournamentId, round: { gt: round } } },
  });
  if (downstreamEntries > 0) {
    return { ok: false, error: "Later rounds already have racers - can't change now." };
  }

  const advancers = roundHeats.reduce(
    (s, h) => s + Math.min(newC, h.entries.length),
    0
  );

  // Persisted per-round overrides: pad to this round with the default, set newC.
  const apr = [...tournament.advancePerRound];
  while (apr.length < round) apr.push(tournament.advanceCount);
  apr[round - 1] = newC;

  const plan = planRounds(
    advancers,
    H,
    (r) => tournament.advancePerRound[r - 1] ?? tournament.advanceCount,
    round + 1
  );

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { tournamentId, round: { gt: round } } });
    await tx.match.updateMany({
      where: { tournamentId, round },
      data: { advanceCount: newC },
    });
    for (const r of plan) {
      for (let position = 0; position < r.heats; position++) {
        await tx.match.create({
          data: {
            tournamentId,
            round: r.round,
            position,
            heatSize: H,
            advanceCount: r.advanceCount,
            status: "PENDING",
          },
        });
      }
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { advancePerRound: apr, totalRounds: plan[plan.length - 1].round },
    });
  });

  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  return { ok: true, data: null };
}

/**
 * Host-only: set the date/time for each stage. Giglings can only race a few
 * times per day, so hosts schedule stages apart. `dates[i]` is the ISO time for
 * stage i+1 (empty string = unscheduled).
 */
export async function setStageScheduleAction(
  tournamentId: string,
  walletAddress: string,
  dates: (string | null)[]
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  if (!(await isManagerOf(tournamentId, walletAddress))) {
    return { ok: false, error: "Only the host or co-hosts can schedule stages." };
  }
  // Trim trailing empties; store as Date[] (skip blanks by storing epoch? no -
  // Prisma DateTime[] can't hold nulls, so we store a dense prefix array).
  const parsed: Date[] = [];
  for (const d of dates) {
    if (!d) {
      parsed.push(new Date(0)); // sentinel "unscheduled"
      continue;
    }
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) {
      parsed.push(new Date(0));
    } else {
      parsed.push(dt);
    }
  }
  // Drop trailing sentinels so the array stays tidy.
  while (parsed.length > 0 && parsed[parsed.length - 1].getTime() === 0) {
    parsed.pop();
  }
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { stageDates: parsed },
  });
  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  return { ok: true, data: null };
}

/** Host-only: open (DRAFT->REGISTRATION) or close (REGISTRATION->DRAFT) signups. */
export async function setRegistrationOpenAction(
  tournamentId: string,
  walletAddress: string,
  open: boolean
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  if (!t) return { ok: false, error: "Tournament not found" };
  if (!isManager(t, walletAddress)) {
    return { ok: false, error: "Only the host or co-hosts can change registration." };
  }
  if (open && t.status !== "DRAFT") {
    return { ok: false, error: "Registration can only be opened from draft." };
  }
  if (!open && t.status !== "REGISTRATION") {
    return { ok: false, error: "Registration is not currently open." };
  }
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: open ? "REGISTRATION" : "DRAFT" },
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, data: null };
}

/** Host-only: remove a participant before the tournament starts. */
export async function removeParticipantAction(
  participantId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: { tournament: { include: { host: true } } },
  });
  if (!participant) return { ok: false, error: "Participant not found" };
  if (!isManager(participant.tournament, walletAddress)) {
    return { ok: false, error: "Only the host or co-hosts can remove participants." };
  }
  if (
    participant.tournament.status !== "REGISTRATION" &&
    participant.tournament.status !== "DRAFT"
  ) {
    return { ok: false, error: "Participants can only be removed before the tournament starts." };
  }
  await prisma.participant.delete({ where: { id: participantId } });
  revalidatePath(`/tournaments/${participant.tournamentId}`);
  return { ok: true, data: null };
}

export async function cancelTournamentAction(
  tournamentId: string,
  walletAddress: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  walletAddress = __caller;
  if (!(await isPrimaryHostOf(tournamentId, walletAddress))) {
    return { ok: false, error: "Only the primary host can cancel this competition." };
  }
  await cancelTournamentEngine(tournamentId);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, data: null };
}

/** Primary-host only: grant co-host (manager) rights to wallets. */
export async function addCoHostsAction(
  tournamentId: string,
  hostAddress: string,
  addresses: string[]
): Promise<ActionResult<{ added: number }>> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  hostAddress = __caller;
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  if (!t) return { ok: false, error: "Competition not found" };
  if (!isPrimaryHost(t, hostAddress)) {
    return { ok: false, error: "Only the primary host can manage co-hosts." };
  }

  const hostWallet = t.host.walletAddress.toLowerCase();
  const next = new Set(t.coHosts.map((c) => c.toLowerCase()));
  let added = 0;
  for (const raw of addresses) {
    const parsed = walletSchema.safeParse(raw.trim());
    if (!parsed.success) continue;
    const w = parsed.data.toLowerCase();
    if (w === hostWallet || next.has(w)) continue; // skip host + dupes
    next.add(w);
    added++;
  }
  // Ensure the co-hosts have user rows so their profiles/links resolve.
  await Promise.all(
    [...next].map((w) => getOrCreateUser(w))
  );
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { coHosts: [...next] },
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, data: { added } };
}

/** Primary-host only: revoke a co-host. */
export async function removeCoHostAction(
  tournamentId: string,
  hostAddress: string,
  address: string
): Promise<ActionResult> {
  const __caller = await getSessionWallet();
  if (!__caller)
    return { ok: false, error: "Sign in with your wallet to continue." };
  hostAddress = __caller;
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { host: true },
  });
  if (!t) return { ok: false, error: "Competition not found" };
  if (!isPrimaryHost(t, hostAddress)) {
    return { ok: false, error: "Only the primary host can manage co-hosts." };
  }
  const target = address.toLowerCase();
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { coHosts: t.coHosts.filter((c) => c.toLowerCase() !== target) },
  });
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, data: null };
}
