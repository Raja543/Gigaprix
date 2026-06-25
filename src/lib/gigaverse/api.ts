import type {
  EloLeaderboardEntry,
  Gigling,
  GlobalStats,
  PetStats,
  PlayerRaceSummary,
} from "@/types/gigaverse";
import {
  mockEloLeaderboard,
  mockGiglingById,
  mockGlobalStats,
  mockPetStats,
  mockPlayerGiglings,
  mockPlayerRaces,
} from "./mock";

const API_BASE =
  process.env.GIGAVERSE_API_BASE ?? "https://gigaverse.io/api/racing";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_GIGAVERSE === "true";

class GigaverseApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "GigaverseApiError";
  }
}

// Cap each Gigaverse call so a slow/unresponsive API can't hang a serverless
// function past its timeout (which would surface as a 500 / error page). Kept
// tight because several pages block their render on these calls.
const API_TIMEOUT_MS = 4000;

async function apiFetch<T>(
  path: string,
  retries = 1,
  revalidate = 30
): Promise<T> {
  const url = `${API_BASE}${path}`;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new GigaverseApiError(`Gigaverse API ${res.status} for ${path}`, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new GigaverseApiError(`Gigaverse API request failed for ${path}`);
}

const lower = (s: string) => s.toLowerCase();

// ─── Raw response shapes (subset) ───────────────────────

interface RacesResponse {
  success: boolean;
  races: {
    raceId: number;
    phase: number;
    fieldSize: number;
    trackLength: number;
    petCount: number;
    createdAt?: number;
    raceStart?: number;
    cancelledAt?: number;
    creator?: string;
    entries: { petId: number; ownerAddress: string; slot: number }[];
  }[];
}

interface PetStatsResponse {
  success: boolean;
  stats: {
    petId: number;
    totalRaces: number;
    wins: number;
    podiums: number;
    recent: {
      raceId: number;
      rank: number; // 0-indexed finishing place
      settledAt: number;
    }[];
  };
}

interface EloResponse {
  success: boolean;
  entries: {
    rank: number;
    petId: number;
    elo: number;
    racesRun: number;
    wins: number;
    ownerAddress: string;
  }[];
}

interface StatsResponse {
  success: boolean;
  data: {
    totalRacesCreated: number;
    racesByPhase: Record<string, number>;
    totalEntries: number;
    uniqueRacers: number;
    uniqueCreators: number;
  };
}

interface PetsResponse {
  success: boolean;
  pets: {
    id: number;
    ownerAddress: string;
    name: string;
    imgUrl?: string;
    rarity?: number;
    rarityName?: string;
    rarityColor?: string;
    faction?: number;
    factionName?: string;
    racePublic?: { elo?: number; wins?: number; racesRun?: number };
  }[];
}

// ─── Public API ─────────────────────────────────────────

export async function fetchRace(raceId: bigint): Promise<unknown> {
  if (USE_MOCK) return { raceId: raceId.toString(), phase: 3 };
  return apiFetch(`/race/${raceId.toString()}`);
}

/** Pet stats: race count, wins, recent finishes. */
export async function fetchPetStats(petId: bigint): Promise<PetStats> {
  if (USE_MOCK) return mockPetStats(petId);
  try {
    const { stats } = await apiFetch<PetStatsResponse>(
      `/pets/${petId.toString()}/stats`
    );
    const losses = Math.max(0, stats.totalRaces - stats.wins);
    return {
      petId: BigInt(stats.petId),
      name: `Gigling #${stats.petId}`,
      elo: 0,
      wins: stats.wins,
      losses,
      totalRaces: stats.totalRaces,
      winRate: stats.totalRaces ? Math.round((stats.wins / stats.totalRaces) * 100) : 0,
      recentRaces: (stats.recent ?? []).map((r) => ({
        raceId: BigInt(r.raceId),
        position: r.rank + 1, // contract rank is 0-indexed
        finishTime: 0,
        fieldSize: 0,
        resolvedAt: new Date(r.settledAt * 1000).toISOString(),
      })),
    };
  } catch {
    return mockPetStats(petId);
  }
}

/** Recent races for a wallet (creator or entrant). */
export async function fetchPlayerRaces(
  address: string,
  limit = 20
): Promise<PlayerRaceSummary[]> {
  if (USE_MOCK) return mockPlayerRaces(address, limit);
  try {
    const { races } = await apiFetch<RacesResponse>(`/races/${address}`);
    const me = lower(address);
    const out: PlayerRaceSummary[] = [];
    for (const race of races) {
      const mine = race.entries.find((e) => lower(e.ownerAddress) === me);
      if (!mine) continue;
      out.push({
        raceId: BigInt(race.raceId),
        petId: BigInt(mine.petId),
        position: 0, // finishing rank not exposed by this endpoint
        fieldSize: race.fieldSize,
        finishTime: 0,
        resolvedAt: new Date((race.raceStart ?? race.createdAt ?? 0) * 1000).toISOString(),
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return mockPlayerRaces(address, limit);
  }
}

export interface WalletRaceRef {
  raceId: bigint;
  createdAt: number;
  phase: number;
  isCreator: boolean;
}

async function fetchRacesRaw(path: string): Promise<RacesResponse["races"]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as RacesResponse;
    return data.races ?? [];
  } catch {
    return [];
  }
}

/**
 * Every race a wallet is involved in as creator OR entrant, newest first,
 * fetched fresh (no cache) so a just-created race shows up immediately.
 *
 * Merges two sources because the per-address endpoint only lists races the
 * wallet has *entered* (a created-but-not-yet-joined race is missing): the
 * global recent-races feed (catches a brand-new OPEN race by its creator) and
 * `/races/{address}` (catches older entered races beyond the global window).
 * Used to auto-detect the race a host just made on Gigaverse and link it.
 */
export async function fetchWalletRaces(address: string): Promise<WalletRaceRef[]> {
  if (USE_MOCK) {
    return mockPlayerRaces(address, 20).map((r) => ({
      raceId: r.raceId,
      createdAt: 0,
      phase: 1,
      isCreator: true,
    }));
  }

  const me = lower(address);
  const [global, mine] = await Promise.all([
    fetchRacesRaw(`/races`),
    fetchRacesRaw(`/races/${address}`),
  ]);

  const byId = new Map<string, WalletRaceRef>();
  for (const r of [...global, ...mine]) {
    const isCreator = lower(r.creator ?? "") === me;
    const isEntrant = r.entries?.some((e) => lower(e.ownerAddress) === me);
    if (!isCreator && !isEntrant) continue;
    const key = String(r.raceId);
    if (!byId.has(key)) {
      byId.set(key, {
        raceId: BigInt(r.raceId),
        createdAt: r.createdAt ?? r.raceStart ?? 0,
        phase: r.phase,
        isCreator,
      });
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Enrich a set of pet IDs in one batch call: rarity, faction, ELO, record,
 * image. Returns a map keyed by petId string. Used by giglings, profiles, and
 * participant lists.
 */
export async function fetchGiglingsByIds(
  ids: bigint[]
): Promise<Map<string, Gigling>> {
  const out = new Map<string, Gigling>();
  const unique = [...new Set(ids.map((i) => i.toString()))];
  if (unique.length === 0) return out;
  if (USE_MOCK) {
    for (const id of unique) out.set(id, mockGiglingById(id));
    return out;
  }
  try {
    // Pet metadata (name, image, rarity, faction) is stable — cache 5 min so
    // entrant lists don't re-fetch on every page view.
    const { pets } = await apiFetch<PetsResponse>(
      `/pets?ids=${unique.slice(0, 100).join(",")}`,
      1,
      300
    );
    for (const p of pets) {
      const rp = p.racePublic;
      const wins = rp?.wins;
      const racesRun = rp?.racesRun;
      out.set(String(p.id), {
        petId: BigInt(p.id),
        name: p.name ? `Gigling ${p.name}` : `Gigling #${p.id}`,
        imageUrl: p.imgUrl,
        elo: rp?.elo,
        rarity: p.rarity,
        rarityName: p.rarityName,
        rarityColor: p.rarityColor,
        faction: p.faction,
        factionName: p.factionName,
        wins,
        losses:
          wins !== undefined && racesRun !== undefined
            ? Math.max(0, racesRun - wins)
            : undefined,
      });
    }
  } catch {
    for (const id of unique) out.set(id, mockGiglingById(id));
  }
  return out;
}

/**
 * Giglings (racing pets) for a wallet, derived from the races it has entered,
 * then enriched in one batch call with rarity, faction, ELO and record.
 */
export async function fetchPlayerGiglings(address: string): Promise<Gigling[]> {
  if (USE_MOCK) return mockPlayerGiglings(address);
  try {
    const { races } = await apiFetch<RacesResponse>(`/races/${address}`);
    const me = lower(address);

    const petIds: bigint[] = [];
    const seen = new Set<number>();
    for (const race of races) {
      for (const e of race.entries) {
        if (lower(e.ownerAddress) === me && !seen.has(e.petId)) {
          seen.add(e.petId);
          petIds.push(BigInt(e.petId));
        }
      }
    }
    if (petIds.length === 0) return [];

    const map = await fetchGiglingsByIds(petIds.slice(0, 50));
    return [...map.values()].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
  } catch {
    return mockPlayerGiglings(address);
  }
}

/** ELO leaderboard. */
export async function fetchEloLeaderboard(
  opts: { limit?: number } = {}
): Promise<EloLeaderboardEntry[]> {
  const { limit = 25 } = opts;
  if (USE_MOCK) return mockEloLeaderboard(limit);
  try {
    const { entries } = await apiFetch<EloResponse>(`/leaderboard/elo`);
    return entries.slice(0, limit).map((e) => ({
      rank: e.rank,
      address: e.ownerAddress as `0x${string}`,
      petId: BigInt(e.petId),
      petName: `Gigling #${e.petId}`,
      elo: e.elo,
      wins: e.wins,
      losses: Math.max(0, e.racesRun - e.wins),
    }));
  } catch {
    return mockEloLeaderboard(limit);
  }
}

/** Aggregate global racing stats. */
export async function fetchGlobalStats(): Promise<GlobalStats> {
  if (USE_MOCK) return mockGlobalStats();
  try {
    const { data } = await apiFetch<StatsResponse>(`/stats`);
    return {
      totalRaces: data.totalRacesCreated,
      totalEntries: data.totalEntries,
      uniquePlayers: data.uniqueRacers,
      resolvedRaces: data.racesByPhase?.["3"] ?? 0,
    };
  } catch {
    return mockGlobalStats();
  }
}

export { GigaverseApiError };
