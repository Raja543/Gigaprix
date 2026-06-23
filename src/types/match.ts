import type { MatchStatus } from "@prisma/client";

export type { MatchStatus };

export interface LinkResult {
  ok: boolean;
  matchId: string;
  raceId: string;
  status: MatchStatus;
  warnings: string[];
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  alreadyResolved: boolean;
}

export interface ProcessResult {
  ok: boolean;
  matchId?: string;
  winnerId?: string | null;
  tournamentCompleted: boolean;
  message?: string;
}
