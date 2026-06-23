"use client";

import { useMemo } from "react";
import { roundLabel } from "@/lib/tournament/single-elimination";
import type { UIMatch, UITournamentFull } from "@/types/ui";

export interface BracketRound {
  round: number;
  label: string;
  matches: UIMatch[];
}

/** Group a tournament's matches into ordered round columns for rendering. */
export function useBracket(tournament?: UITournamentFull): BracketRound[] {
  return useMemo(() => {
    if (!tournament) return [];
    const byRound = new Map<number, UIMatch[]>();
    for (const m of tournament.matches) {
      const arr = byRound.get(m.round) ?? [];
      arr.push(m);
      byRound.set(m.round, arr);
    }
    return [...byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({
        round,
        label: roundLabel(round, tournament.totalRounds),
        matches: matches.sort((a, b) => a.position - b.position),
      }));
  }, [tournament]);
}
