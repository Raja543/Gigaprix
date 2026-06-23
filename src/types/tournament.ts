import type {
  CompetitionType,
  Match,
  MatchEntry,
  Participant,
  RaceType,
  Standing,
  Tournament,
  TournamentFormat,
  TournamentStatus,
  User,
} from "@prisma/client";

export type {
  CompetitionType,
  Match,
  MatchEntry,
  Participant,
  RaceType,
  Standing,
  Tournament,
  TournamentFormat,
  TournamentStatus,
  User,
};

export type ParticipantWithUser = Participant & { user: User };

export type StandingWithUser = Standing & { user: User };

export type TournamentWithHost = Tournament & { host: User };

export type MatchEntryWithUser = MatchEntry & { user: User };

export type HeatWithEntries = Match & {
  winner: User | null;
  entries: MatchEntryWithUser[];
};

export type TournamentFull = Tournament & {
  host: User;
  participants: ParticipantWithUser[];
  matches: HeatWithEntries[];
  standings: StandingWithUser[];
  _count?: { participants: number; matches: number };
};

/** Validated config used by the engine to create a tournament. */
export interface CreateTournamentConfig {
  name: string;
  description?: string | null;
  format?: TournamentFormat;
  competitionType?: CompetitionType;
  raceType?: RaceType;
  maxParticipants: number;
  hostId: string;
  heatSize?: number;
  advanceCount?: number;
  advancePerRound?: number[];
  testMode?: boolean;
  whitelistEnabled?: boolean;
  maxPerWallet?: number;
  trackLength?: number;
  itemsMode?: number;
  weatherMode?: number | null;
  factionMode?: number | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  isPublic?: boolean;
  registrationStart?: Date | null;
  registrationEnd?: Date | null;
}
