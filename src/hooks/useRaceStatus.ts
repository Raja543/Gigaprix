"use client";

import { useRaceChannel } from "@/lib/gigaverse/realtime";
import { RACE_PHASE_LABEL, RacePhase } from "@/types/gigaverse";

/**
 * Live status for a linked race. Combines the stored phase with realtime ticks
 * from the GigaSocket `race-{raceId}` channel.
 */
export function useRaceStatus(
  raceId?: string | null,
  storedPhase?: number | null
) {
  const id = raceId ? BigInt(raceId) : null;
  const { connected, tick, broadcast } = useRaceChannel(id);

  const phase = (broadcast?.phase ?? storedPhase ?? RacePhase.IDLE) as RacePhase;

  return {
    connected,
    phase,
    phaseLabel: RACE_PHASE_LABEL[phase] ?? "Unknown",
    isLive: phase === RacePhase.OPEN || phase === RacePhase.RESOLVING,
    tick,
  };
}
