/**
 * Gigaverse Racing - shared type definitions.
 * Covers on-chain reads (PetRacingSystem), REST API responses, and
 * Pusher realtime payloads.
 */

/**
 * On-chain race lifecycle phase (PetRacingSystem `enum RacePhase`, RaceTypes.sol).
 * State machine: OPEN --(field full)--> RESOLVING --(resolveRace)--> RESOLVED,
 * with OPEN --(admin/stale)--> CANCELLED. IDLE (0) means the race was never created.
 */
export enum RacePhase {
  IDLE = 0,
  OPEN = 1,
  RESOLVING = 2,
  RESOLVED = 3,
  CANCELLED = 4,
}

export const RACE_PHASE_LABEL: Record<RacePhase, string> = {
  [RacePhase.IDLE]: "Idle",
  [RacePhase.OPEN]: "Open",
  [RacePhase.RESOLVING]: "Racing",
  [RacePhase.RESOLVED]: "Resolved",
  [RacePhase.CANCELLED]: "Cancelled",
};

/** Result of a resolved race. */
export interface RaceResult {
  raceId: bigint;
  finalRanking: bigint[]; // petIds in finishing order
  finishTimes: bigint[]; // ms, parallel to finalRanking
}

export interface PetPayout {
  petId: bigint;
  owner: `0x${string}`;
  amount: bigint;
  position: number;
}

export interface PayoutPreview {
  raceId: bigint;
  total: bigint;
  payouts: PetPayout[];
}

// ─── REST API responses ─────────────────────────────────

export interface PetStats {
  petId: bigint;
  name?: string;
  imageUrl?: string;
  elo: number;
  wins: number;
  losses: number;
  totalRaces: number;
  winRate: number;
  recentRaces: PetRaceHistoryEntry[];
}

export interface PetRaceHistoryEntry {
  raceId: bigint;
  position: number;
  finishTime: number;
  fieldSize: number;
  resolvedAt: string;
}

/** A gigling (pet NFT) owned by a wallet. */
export interface Gigling {
  petId: bigint;
  name?: string;
  imageUrl?: string;
  elo?: number;
  rarity?: number;
  rarityName?: string;
  rarityColor?: string;
  faction?: number;
  factionName?: string;
  wins?: number;
  losses?: number;
}

export interface EloLeaderboardEntry {
  rank: number;
  address: `0x${string}`;
  petId: bigint;
  petName?: string;
  elo: number;
  wins: number;
  losses: number;
}

export interface PlayerRaceSummary {
  raceId: bigint;
  petId: bigint;
  position: number;
  fieldSize: number;
  finishTime: number;
  resolvedAt: string;
}

export interface GlobalStats {
  totalRaces: number;
  totalEntries: number;
  uniquePlayers: number;
  resolvedRaces: number;
}

// ─── Pusher realtime payloads ───────────────────────────

export interface TickAdvancedEvent {
  raceId: number;
  tick: number;
  positions: { petId: number; progress: number }[];
}

export interface RaceBroadcastEvent {
  raceId: number;
  phase: number;
  message?: string;
}

export interface RaceUpdatedEvent {
  raceId: number;
  phase: number;
}
