import { publicClient } from "./client";
import { PET_RACING_ABI, PET_RACING_ADDRESS } from "./abi";
import { RacePhase } from "@/types/gigaverse";

export { PET_RACING_ABI, PET_RACING_ADDRESS };

const abi = PET_RACING_ABI;

// ─── Read helpers (Gigaverse race contract) ──
// Status is read via getRacePhase and results via the typed array reads below;
// the contract's getRace struct shape isn't relied on.

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
