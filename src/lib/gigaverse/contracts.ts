import { publicClient } from "./client";
import { PET_RACING_ABI, PET_RACING_ADDRESS } from "./abi";
import { RacePhase, type Race } from "@/types/gigaverse";

export { PET_RACING_ABI, PET_RACING_ADDRESS };

const abi = PET_RACING_ABI;

// ─── Read helpers (Gigaverse race contract) ──

/**
 * NOTE: the live PetRacingSystem `getRace` struct does NOT match this ABI (the
 * real tuple has fewer fields), so this call reverts on decode. Use
 * `getRacePhase` for status and the typed array reads below for results. Kept
 * only for reference; do not use until the struct shape is verified on-chain.
 */
export async function getRace(
  raceId: bigint,
  address: `0x${string}` = PET_RACING_ADDRESS
): Promise<Race> {
  const r = (await publicClient.readContract({
    address,
    abi,
    functionName: "getRace",
    args: [raceId],
  })) as {
    phase: number;
    raceStart: bigint;
    raceFinish: bigint;
    entryFee: bigint;
    pool: bigint;
    fieldSize: bigint;
    petCount: bigint;
    trackLength: bigint;
    creator: `0x${string}`;
    isPrivate: boolean;
  };
  return {
    raceId,
    phase: r.phase as RacePhase,
    raceStart: r.raceStart,
    raceFinish: r.raceFinish,
    entryFee: r.entryFee,
    pool: r.pool,
    fieldSize: Number(r.fieldSize),
    petCount: Number(r.petCount),
    trackLength: Number(r.trackLength),
    creator: r.creator,
    isPrivate: r.isPrivate,
  };
}

export async function getRacePhase(
  raceId: bigint,
  address: `0x${string}` = PET_RACING_ADDRESS
): Promise<RacePhase> {
  return (await publicClient.readContract({
    address,
    abi,
    functionName: "getRacePhase",
    args: [raceId],
  })) as RacePhase;
}

export async function getRacePets(
  raceId: bigint,
  address: `0x${string}` = PET_RACING_ADDRESS
): Promise<bigint[]> {
  return [
    ...((await publicClient.readContract({
      address,
      abi,
      functionName: "getRacePets",
      args: [raceId],
    })) as readonly bigint[]),
  ];
}

export async function getRaceFinalRanking(
  raceId: bigint,
  address: `0x${string}` = PET_RACING_ADDRESS
): Promise<bigint[]> {
  return [
    ...((await publicClient.readContract({
      address,
      abi,
      functionName: "getRaceFinalRanking",
      args: [raceId],
    })) as readonly bigint[]),
  ];
}

export async function getRaceFinishTimes(
  raceId: bigint,
  address: `0x${string}` = PET_RACING_ADDRESS
): Promise<bigint[]> {
  return [
    ...((await publicClient.readContract({
      address,
      abi,
      functionName: "getRaceFinishTimes",
      args: [raceId],
    })) as readonly bigint[]),
  ];
}

export async function getPetOwnerInRace(
  raceId: bigint,
  petId: bigint,
  address: `0x${string}` = PET_RACING_ADDRESS
): Promise<`0x${string}`> {
  return (await publicClient.readContract({
    address,
    abi,
    functionName: "getPetOwnerInRace",
    args: [raceId, petId],
  })) as `0x${string}`;
}
