import type { MatchStatus } from "@prisma/client";

export const MAX_HEAT_SIZE = 8;

export interface SeededParticipant {
  participantId: string;
  userId: string;
  petId: bigint | null;
  seed: number; // 1-indexed
}

export interface HeatEntryPlan {
  participantId: string;
  userId: string;
  petId: bigint | null;
  seed: number;
}

export interface HeatPlan {
  round: number; // 1-indexed
  position: number; // heat index within round
  advanceCount: number; // how many advance from this heat
  entries: HeatEntryPlan[]; // populated for round 1 only; later rounds fill on advancement
  status: MatchStatus;
}

/** Championship stage label: "Stage 1", "Stage 2", … with the last stage as "Final". */
export function roundLabel(round: number, totalRounds: number): string {
  if (round >= totalRounds) return "Final";
  return `Stage ${round}`;
}

/**
 * Compute how many racers advance out of a round, guaranteeing the field
 * shrinks toward a single final heat of ≤ heatSize.
 */
function advancersOut(racers: number, heatSize: number, advanceCount: number) {
  const heats = Math.ceil(racers / heatSize);
  let adv = heats * advanceCount;
  // Two-heat boundary with a large advanceCount could stall - collapse to a
  // clean final of heatSize (≈ heatSize/2 advance from each heat).
  if (heats === 2 && adv >= racers) adv = heatSize;
  if (adv >= racers) adv = racers - 1; // generic safety: always make progress
  const perHeat = Math.ceil(adv / heats);
  return { heats, adv, perHeat };
}

export interface RoundPlan {
  round: number;
  heats: number;
  advanceCount: number;
}

/**
 * Plan the rounds for `startRacers` racers, beginning at `startRound`. `advFor`
 * returns the desired top-N advance for an absolute round number. Each round
 * shrinks the field until ≤ heatSize, then a final round. Reused for initial
 * generation and for regenerating downstream rounds when a cutoff changes.
 */
export function planRounds(
  startRacers: number,
  heatSize: number,
  advFor: (round: number) => number,
  startRound = 1
): RoundPlan[] {
  const H = Math.min(Math.max(2, heatSize), MAX_HEAT_SIZE);
  const rounds: RoundPlan[] = [];
  let racers = startRacers;
  let round = startRound;
  while (racers > H) {
    const a = Math.min(Math.max(1, advFor(round)), H - 1);
    const { heats, adv, perHeat } = advancersOut(racers, H, a);
    rounds.push({ round, heats, advanceCount: perHeat });
    racers = adv;
    round++;
  }
  rounds.push({ round, heats: 1, advanceCount: 1 }); // final
  return rounds;
}

/** Resolve a per-round advance value from a number or per-round array. */
export function advanceForRound(advance: number | number[], round: number): number {
  if (Array.isArray(advance)) {
    return advance[round - 1] ?? advance[advance.length - 1] ?? 4;
  }
  return advance;
}

/**
 * Generate a heat-based single-elimination structure. Round 1 distributes
 * racers across heats (snake seeding to spread strong seeds); later rounds are
 * created empty and filled as racers advance.
 */
export function generateHeatBracket(
  participants: SeededParticipant[],
  heatSize = MAX_HEAT_SIZE,
  advance: number | number[] = 4
): { heats: HeatPlan[]; totalRounds: number } {
  const n = participants.length;
  if (n < 2) return { heats: [], totalRounds: 0 };

  const H = Math.min(Math.max(2, heatSize), MAX_HEAT_SIZE);
  const plan = planRounds(n, H, (round) => advanceForRound(advance, round), 1);
  const totalRounds = plan.length;

  // Build empty heat plans for every round.
  const heats: HeatPlan[] = [];
  for (const r of plan) {
    for (let position = 0; position < r.heats; position++) {
      heats.push({
        round: r.round,
        position,
        advanceCount: r.advanceCount,
        entries: [],
        status: "PENDING",
      });
    }
  }

  // Seed round 1 with snake distribution.
  const round1 = heats
    .filter((h) => h.round === 1)
    .sort((a, b) => a.position - b.position);
  const h = round1.length;
  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  sorted.forEach((p, i) => {
    const row = Math.floor(i / h);
    const col = i % h;
    const heatIndex = row % 2 === 0 ? col : h - 1 - col;
    round1[heatIndex].entries.push({
      participantId: p.participantId,
      userId: p.userId,
      petId: p.petId,
      seed: p.seed,
    });
  });

  // A heat with a single racer is a bye.
  for (const heat of round1) {
    if (heat.entries.length === 1) heat.status = "BYE";
  }

  return { heats, totalRounds };
}
