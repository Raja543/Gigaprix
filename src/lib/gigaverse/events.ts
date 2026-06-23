import { PET_RACING_ADDRESS, publicClient } from "./client";
import { parseAbiItem, type Log } from "viem";

/**
 * On-chain event definitions for PetRacingSystem (from the official ABI).
 * Used for optional event-based detection of resolved races; the cron sync
 * (getRacePhase polling) is the primary, always-available mechanism.
 */
export const RACE_RESOLVED_EVENT = parseAbiItem(
  "event RaceResolved(uint256 indexed raceId, uint256[] finalRanking, uint256[] msFinishTimes, uint256[] extraParamIds, uint256[] extraParamVals)"
);

export const PHASE_ADVANCED_EVENT = parseAbiItem(
  "event PhaseAdvanced(uint256 indexed raceId, uint8 newPhase)"
);

export const PET_JOINED_EVENT = parseAbiItem(
  "event PetJoined(uint256 indexed raceId, uint256 indexed petId, address indexed owner)"
);

export const RACE_CANCELLED_EVENT = parseAbiItem(
  "event RaceCancelled(uint256 indexed raceId, address indexed cancelledBy)"
);

export interface RaceResolvedPayload {
  raceId: bigint;
  finalRanking: bigint[];
  msFinishTimes: bigint[];
}

/**
 * Fetch RaceResolved logs for a set of linked race IDs within a block range.
 * Used as a backstop to the cron poller.
 */
export async function getRaceResolvedLogs(
  fromBlock: bigint,
  toBlock: bigint | "latest" = "latest"
): Promise<RaceResolvedPayload[]> {
  const logs = (await publicClient.getLogs({
    address: PET_RACING_ADDRESS,
    event: RACE_RESOLVED_EVENT,
    fromBlock,
    toBlock,
  })) as Log[];

  return logs
    .map((log) => {
      const args = (log as unknown as { args?: RaceResolvedPayload }).args;
      if (!args) return null;
      return {
        raceId: args.raceId,
        finalRanking: [...args.finalRanking],
        msFinishTimes: [...args.msFinishTimes],
      };
    })
    .filter((x): x is RaceResolvedPayload => x !== null);
}

/**
 * Watch RaceResolved events in real time (long-running listener contexts only,
 * e.g. a dedicated worker - not serverless route handlers).
 */
export function watchRaceResolved(
  onResolved: (payload: RaceResolvedPayload) => void
) {
  return publicClient.watchEvent({
    address: PET_RACING_ADDRESS,
    event: RACE_RESOLVED_EVENT,
    onLogs: (logs) => {
      for (const log of logs) {
        const args = (log as unknown as { args?: RaceResolvedPayload }).args;
        if (args) {
          onResolved({
            raceId: args.raceId,
            finalRanking: [...args.finalRanking],
            msFinishTimes: [...args.msFinishTimes],
          });
        }
      }
    },
  });
}
