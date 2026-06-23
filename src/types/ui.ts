import type {
  CompetitionType,
  MatchStatus,
  RaceType,
  TournamentFormat,
  TournamentStatus,
} from "@prisma/client";

/**
 * Client-safe view models. BigInt fields are serialized to strings and dates to
 * ISO strings so these shapes can cross the RSC → client boundary.
 */

export interface UIUser {
  id: string;
  walletAddress: string;
  username: string | null;
  avatar: string | null;
  discord: string | null;
  twitter: string | null;
  bio: string | null;
  elo: number | null;
  totalRaces: number;
}

export interface UIParticipant {
  id: string;
  userId: string;
  petId: string | null;
  seed: number | null;
  isEliminated: boolean;
  user: UIUser;
}

export interface UIMatchEntry {
  id: string;
  matchId: string;
  participantId: string;
  userId: string;
  petId: string | null;
  seed: number | null;
  finishPosition: number | null;
  finishTime: string | null;
  advanced: boolean;
  user: UIUser;
}

/** A heat: one race of up to heatSize racers. */
export interface UIMatch {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  heatSize: number;
  advanceCount: number;
  raceId: string | null;
  racePhase: number | null;
  winnerId: string | null;
  winnerPetId: string | null;
  finalRanking: unknown;
  status: MatchStatus;
  nextMatchId: string | null;
  winner: UIUser | null;
  entries: UIMatchEntry[];
}

export interface UIStanding {
  id: string;
  userId: string;
  walletAddress: string;
  wins: number;
  racesPlayed: number;
  points: number;
  bestTime: string | null;
  streak: number;
  rank: number | null;
  user: UIUser;
}

export interface UITournament {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  competitionType: CompetitionType;
  raceType: RaceType;
  status: TournamentStatus;
  maxParticipants: number;
  currentRound: number;
  totalRounds: number;
  heatSize: number;
  advanceCount: number;
  advancePerRound: number[];
  testMode: boolean;
  whitelistEnabled: boolean;
  maxPerWallet: number;
  coHosts: string[];
  trackLength: number;
  stageDates: string[];
  bannerUrl: string | null;
  accentColor: string | null;
  isPublic: boolean;
  registrationEnd: string | null;
  startedAt: string | null;
  completedAt: string | null;
  championId: string | null;
  hostId: string;
  createdAt: string;
  host: UIUser;
}

export interface UITournamentFull extends UITournament {
  participants: UIParticipant[];
  matches: UIMatch[];
  standings: UIStanding[];
}

export interface UITournamentCard extends UITournament {
  _count: { participants: number; matches: number };
}

/** Client-safe gigling (pet) view model. */
export interface UIGigling {
  petId: string;
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
