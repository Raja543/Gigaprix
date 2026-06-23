import { describe, it, expect } from "vitest";
import { generateHeatLeague } from "./round-robin";
import type { SeededParticipant } from "./single-elimination";

function seed(n: number): SeededParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    participantId: `p${i}`,
    userId: `u${i}`,
    petId: null,
    seed: i + 1,
  }));
}

describe("generateHeatLeague", () => {
  it("returns nothing for fewer than 2 racers", () => {
    expect(generateHeatLeague(seed(1))).toEqual({ heats: [], totalRounds: 0 });
  });

  it("runs multiple matchdays with no group over the heat size", () => {
    const { heats, totalRounds } = generateHeatLeague(seed(16), 8);
    expect(totalRounds).toBeGreaterThanOrEqual(3);
    for (const h of heats) {
      expect(h.entries.length).toBeLessThanOrEqual(8);
      expect(h.advanceCount).toBe(0); // league: no qualification
    }
  });

  it("places every racer exactly once per matchday", () => {
    const n = 20;
    const { heats } = generateHeatLeague(seed(n), 8);
    const byDay = new Map<number, Set<string>>();
    for (const h of heats) {
      const set = byDay.get(h.round) ?? new Set<string>();
      for (const e of h.entries) set.add(e.participantId);
      byDay.set(h.round, set);
    }
    for (const set of byDay.values()) {
      expect(set.size).toBe(n);
    }
  });
});
