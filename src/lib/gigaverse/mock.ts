import type {
  EloLeaderboardEntry,
  Gigling,
  GlobalStats,
  PetStats,
  PlayerRaceSummary,
} from "@/types/gigaverse";

/**
 * Deterministic mock data for Gigaverse REST endpoints. Used as a graceful
 * fallback when the live API is unreachable or NEXT_PUBLIC_USE_MOCK_GIGAVERSE
 * is enabled, so the UI always has something meaningful to render.
 */

function seeded(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

export function mockPetStats(petId: bigint): PetStats {
  const id = Number(petId % 10000n);
  const wins = 10 + Math.floor(seeded(id) * 90);
  const losses = 5 + Math.floor(seeded(id + 1) * 60);
  const total = wins + losses;
  return {
    petId,
    name: `Pet #${petId.toString()}`,
    elo: 1200 + Math.floor(seeded(id + 2) * 600),
    wins,
    losses,
    totalRaces: total,
    winRate: Math.round((wins / total) * 100),
    recentRaces: Array.from({ length: 6 }).map((_, i) => ({
      raceId: BigInt(100000 + id * 10 + i),
      position: 1 + Math.floor(seeded(id + i + 3) * 6),
      finishTime: 11000 + Math.floor(seeded(id + i + 4) * 6000),
      fieldSize: 6,
      resolvedAt: new Date(Date.now() - i * 3600_000).toISOString(),
    })),
  };
}

export function mockPlayerRaces(
  address: string,
  limit: number
): PlayerRaceSummary[] {
  const base = address
    .toLowerCase()
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: limit }).map((_, i) => ({
    raceId: BigInt(200000 + base + i),
    petId: BigInt(1000 + (base % 500)),
    position: 1 + Math.floor(seeded(base + i) * 6),
    fieldSize: 6,
    finishTime: 11000 + Math.floor(seeded(base + i + 1) * 6000),
    resolvedAt: new Date(Date.now() - i * 7200_000).toISOString(),
  }));
}

export function mockEloLeaderboard(limit: number): EloLeaderboardEntry[] {
  return Array.from({ length: limit }).map((_, i) => ({
    rank: i + 1,
    address: `0x${(i + 1).toString(16).padStart(40, "0")}` as `0x${string}`,
    petId: BigInt(1000 + i),
    petName: `Champion ${i + 1}`,
    elo: 2200 - i * 13 - Math.floor(seeded(i) * 8),
    wins: 200 - i * 3,
    losses: 30 + i,
  }));
}

const RARITY: Record<number, { name: string; color: string }> = {
  0: { name: "Common", color: "#9aa0aa" },
  1: { name: "Uncommon", color: "#4ade80" },
  2: { name: "Rare", color: "#38bdf8" },
  3: { name: "Epic", color: "#38bdf8" },
  4: { name: "Legendary", color: "#f59e0b" },
  5: { name: "Relic", color: "#CC4D00" },
  6: { name: "Giga", color: "#ff3b5c" },
};

export function mockGiglingById(id: string): Gigling {
  const n = Number(BigInt(id) % 100000n);
  const wins = 5 + Math.floor(seeded(n) * 80);
  const losses = 3 + Math.floor(seeded(n + 1) * 50);
  const rarity = Math.floor(seeded(n + 2) * 7);
  return {
    petId: BigInt(id),
    name: `Gigling #${id}`,
    elo: 1200 + Math.floor(seeded(n + 3) * 600),
    rarity,
    rarityName: RARITY[rarity].name,
    rarityColor: RARITY[rarity].color,
    wins,
    losses,
  };
}

export function mockPlayerGiglings(address: string): Gigling[] {
  const base = address
    .toLowerCase()
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 2 + (base % 4); // 2–5 giglings
  return Array.from({ length: count }).map((_, i) => {
    const id = 1000 + (base % 700) + i;
    const wins = 5 + Math.floor(seeded(id) * 80);
    const losses = 3 + Math.floor(seeded(id + 1) * 50);
    const rarity = Math.floor(seeded(id + 2) * 7);
    return {
      petId: BigInt(id),
      name: `Gigling #${id}`,
      elo: 1200 + Math.floor(seeded(id + 3) * 600),
      rarity,
      rarityName: RARITY[rarity].name,
      rarityColor: RARITY[rarity].color,
      wins,
      losses,
    };
  });
}

export function mockGlobalStats(): GlobalStats {
  return {
    totalRaces: 9_555,
    totalEntries: 58_420,
    uniquePlayers: 1_210,
    resolvedRaces: 8_639,
  };
}
