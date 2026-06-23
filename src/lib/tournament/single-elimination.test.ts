import { describe, it, expect } from "vitest";
import {
  generateHeatBracket,
  planRounds,
  advanceForRound,
  roundLabel,
  type SeededParticipant,
} from "./single-elimination";

function seed(n: number): SeededParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    participantId: `p${i}`,
    userId: `u${i}`,
    petId: null,
    seed: i + 1,
  }));
}

describe("planRounds", () => {
  it("collapses a small field into a single final", () => {
    const plan = planRounds(8, 8, () => 4);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ round: 1, heats: 1, advanceCount: 1 });
  });

  it("shrinks 64 racers (top 4/group) down to a single final", () => {
    const plan = planRounds(64, 8, () => 4);
    // 64 -> 32 -> 16 -> 8 -> final: groups per stage shrink to one.
    expect(plan.map((r) => r.heats)).toEqual([8, 4, 2, 1]);
    expect(plan[plan.length - 1].heats).toBe(1);
    expect(plan[plan.length - 1].advanceCount).toBe(1); // final crowns one
  });

  it("reaches a single final faster with steeper cutoffs", () => {
    const plan = planRounds(64, 8, () => 2); // top 2/group
    expect(plan[plan.length - 1].heats).toBe(1);
  });

  it("always makes progress (never stalls) for awkward sizes", () => {
    for (const n of [3, 5, 9, 13, 17, 31, 50, 100, 250]) {
      const plan = planRounds(n, 8, () => 4);
      expect(plan.length).toBeGreaterThan(0);
      // last round is always a single final heat
      expect(plan[plan.length - 1].heats).toBe(1);
    }
  });
});

describe("advanceForRound", () => {
  it("returns the scalar for a number", () => {
    expect(advanceForRound(4, 1)).toBe(4);
    expect(advanceForRound(4, 3)).toBe(4);
  });
  it("indexes per-round arrays and falls back to the last entry", () => {
    expect(advanceForRound([4, 2, 1], 1)).toBe(4);
    expect(advanceForRound([4, 2, 1], 2)).toBe(2);
    expect(advanceForRound([4, 2, 1], 9)).toBe(1);
  });
});

describe("roundLabel", () => {
  it("labels the last stage as the final", () => {
    expect(roundLabel(3, 3)).toBe("Final");
    expect(roundLabel(1, 3)).toBe("Stage 1");
    expect(roundLabel(2, 3)).toBe("Stage 2");
  });
});

describe("generateHeatBracket", () => {
  it("returns nothing for fewer than 2 racers", () => {
    expect(generateHeatBracket(seed(1))).toEqual({ heats: [], totalRounds: 0 });
  });

  it("places every racer exactly once in round 1", () => {
    const { heats } = generateHeatBracket(seed(64), 8, 4);
    const r1 = heats.filter((h) => h.round === 1);
    const placed = r1.flatMap((h) => h.entries.map((e) => e.participantId));
    expect(placed).toHaveLength(64);
    expect(new Set(placed).size).toBe(64);
  });

  it("never exceeds the heat size per group", () => {
    const { heats } = generateHeatBracket(seed(50), 8, 4);
    for (const h of heats.filter((x) => x.round === 1)) {
      expect(h.entries.length).toBeLessThanOrEqual(8);
    }
  });

  it("marks a lone racer in a group as a bye", () => {
    // 9 racers, heat size 8 -> 2 groups, one will have a single racer paths vary;
    // ensure any single-entry group is flagged BYE.
    const { heats } = generateHeatBracket(seed(9), 8, 4);
    for (const h of heats.filter((x) => x.round === 1)) {
      if (h.entries.length === 1) expect(h.status).toBe("BYE");
    }
  });
});
