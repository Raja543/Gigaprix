import type { MatchStatus } from "@prisma/client";
import { MAX_HEAT_SIZE, type HeatPlan, type SeededParticipant } from "./single-elimination";

/**
 * Heat league: every matchday, all racers are partitioned into heats of ≤
 * heatSize. Rotating the order each matchday varies the groupings so racers
 * face a changing field. No elimination - standings are decided by points
 * (finish position) accumulated across all heats.
 */
export function generateHeatLeague(
  participants: SeededParticipant[],
  heatSize = MAX_HEAT_SIZE
): { heats: HeatPlan[]; totalRounds: number } {
  const n = participants.length;
  if (n < 2) return { heats: [], totalRounds: 0 };

  const H = Math.min(Math.max(2, heatSize), MAX_HEAT_SIZE);
  const heatsPerDay = Math.ceil(n / H);
  // A few matchdays so everyone races several times against varied fields.
  const matchdays = n <= H ? 3 : heatsPerDay + 2;

  const ordered = [...participants].sort((a, b) => a.seed - b.seed);
  const heats: HeatPlan[] = [];

  for (let day = 0; day < matchdays; day++) {
    // Rotate the field by a day-dependent offset for varied groupings.
    const offset = (day * Math.max(1, Math.floor(n / matchdays))) % n;
    const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)];

    const dayHeats: HeatPlan[] = Array.from({ length: heatsPerDay }, (_, position) => ({
      round: day + 1,
      position,
      advanceCount: 0, // not used in a league
      entries: [],
      status: "PENDING" as MatchStatus,
    }));

    // Snake-distribute so heat strength stays balanced each day.
    rotated.forEach((p, i) => {
      const row = Math.floor(i / heatsPerDay);
      const col = i % heatsPerDay;
      const idx = row % 2 === 0 ? col : heatsPerDay - 1 - col;
      dayHeats[idx].entries.push({
        participantId: p.participantId,
        userId: p.userId,
        petId: p.petId,
        seed: p.seed,
      });
    });

    for (const heat of dayHeats) {
      if (heat.entries.length === 1) heat.status = "BYE";
      heats.push(heat);
    }
  }

  return { heats, totalRounds: matchdays };
}
