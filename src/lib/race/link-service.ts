import { prisma } from "@/lib/db";
import {
  getRacePhase,
  getRacePets,
  getPetOwnerInRace,
} from "@/lib/gigaverse/contracts";
import { normalizeAddress } from "@/lib/users";
import { RacePhase } from "@/types/gigaverse";
import type { LinkResult, ValidationResult } from "@/types/match";
import { processRaceResult } from "./result-processor";

/**
 * Validate that an on-chain race can back a heat. Reads are best-effort:
 * contract errors surface as a validation failure rather than throwing.
 */
export async function validateRaceForHeat(
  raceId: bigint,
  heatId: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let alreadyResolved = false;

  let phase: RacePhase;
  try {
    phase = await getRacePhase(raceId);
  } catch {
    return {
      valid: false,
      errors: [`Could not read race ${raceId} on-chain. Check the race ID.`],
      warnings,
      alreadyResolved,
    };
  }

  if (phase === RacePhase.IDLE) errors.push("Race does not exist (phase is IDLE).");
  if (phase === RacePhase.CANCELLED) errors.push("Race was cancelled on-chain.");
  if (phase === RacePhase.RESOLVED) alreadyResolved = true;

  const existing = await prisma.match.findFirst({
    where: { raceId, id: { not: heatId } },
  });
  if (existing) errors.push("This race is already linked to another heat.");

  // Identity check: the race must belong to this heat's players. Read the race's
  // pets and their owners on-chain and confirm each owner is a heat participant.
  // Fail-open on read errors (don't block legit links on an RPC hiccup), but
  // fail-closed on a confirmed outsider so a random race can't be linked.
  if (errors.length === 0) {
    const identityError = await checkRaceBelongsToHeat(raceId, heatId);
    if (identityError) errors.push(identityError);
  }

  return { valid: errors.length === 0, errors, warnings, alreadyResolved };
}

/**
 * Returns an error string if the race contains a racer who isn't in this heat,
 * or null if it's fine / couldn't be verified.
 */
async function checkRaceBelongsToHeat(
  raceId: bigint,
  heatId: string
): Promise<string | null> {
  const heat = await prisma.match.findUnique({
    where: { id: heatId },
    include: { entries: { include: { user: true } } },
  });
  if (!heat) return null;

  const heatWallets = new Set(
    heat.entries.map((e) => normalizeAddress(e.user.walletAddress))
  );
  if (heatWallets.size === 0) return null;

  let pets: bigint[];
  try {
    pets = await getRacePets(raceId);
  } catch {
    return null; // can't verify -> don't block
  }
  if (pets.length === 0) return null; // empty/open race -> nothing to check yet

  for (const petId of pets) {
    let owner: string;
    try {
      owner = normalizeAddress(await getPetOwnerInRace(raceId, petId));
    } catch {
      return null; // can't verify owners -> don't block
    }
    if (!heatWallets.has(owner)) {
      return "This race includes a racer who isn't in this heat. Link the race created for this group's players.";
    }
  }
  return null;
}

/**
 * Link an on-chain race to a heat. If the race is already resolved, results are
 * processed (and the bracket advanced) immediately.
 */
export async function linkRaceToMatch(
  heatId: string,
  raceId: bigint
): Promise<LinkResult> {
  const heat = await prisma.match.findUnique({
    where: { id: heatId },
    include: { entries: true },
  });
  if (!heat) {
    return {
      ok: false,
      matchId: heatId,
      raceId: raceId.toString(),
      status: "PENDING",
      warnings: [],
      message: "Heat not found.",
    };
  }
  if (heat.entries.length === 0) {
    return {
      ok: false,
      matchId: heatId,
      raceId: raceId.toString(),
      status: heat.status,
      warnings: [],
      message: "This heat has no racers yet.",
    };
  }
  if (heat.status === "COMPLETED" || heat.status === "BYE") {
    return {
      ok: false,
      matchId: heatId,
      raceId: raceId.toString(),
      status: heat.status,
      warnings: [],
      message: "This heat is already resolved.",
    };
  }

  const validation = await validateRaceForHeat(raceId, heatId);
  if (!validation.valid) {
    return {
      ok: false,
      matchId: heatId,
      raceId: raceId.toString(),
      status: heat.status,
      warnings: validation.warnings,
      message: validation.errors.join(" "),
    };
  }

  await prisma.match.update({
    where: { id: heatId },
    data: { raceId, status: "RACE_LINKED", racePhase: RacePhase.OPEN },
  });

  if (validation.alreadyResolved) {
    const result = await processRaceResult(raceId);
    return {
      ok: result.ok,
      matchId: heatId,
      raceId: raceId.toString(),
      status: result.ok ? "COMPLETED" : "RACE_LINKED",
      warnings: validation.warnings,
      message: result.message,
    };
  }

  return {
    ok: true,
    matchId: heatId,
    raceId: raceId.toString(),
    status: "RACE_LINKED",
    warnings: validation.warnings,
    message: "Race linked. Waiting for it to resolve on-chain.",
  };
}

/** Remove a race link if the heat hasn't completed yet. */
export async function unlinkRace(heatId: string): Promise<void> {
  const heat = await prisma.match.findUnique({ where: { id: heatId } });
  if (!heat) throw new Error("Heat not found");
  if (heat.status === "COMPLETED" || heat.status === "BYE") {
    throw new Error("Cannot unlink a resolved heat");
  }
  await prisma.match.update({
    where: { id: heatId },
    data: { raceId: null, racePhase: null, status: "PENDING" },
  });
}
