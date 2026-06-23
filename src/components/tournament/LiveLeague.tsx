"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MatchCard } from "./MatchCard";
import { HeatControl } from "./HeatControl";
import { CopyWalletsButton } from "./CopyWalletsButton";
import { StandingsTable } from "./StandingsTable";
import { useTournament } from "@/hooks/useTournament";
import { useGiglings } from "@/hooks/useGiglings";
import { useLobbyChannel } from "@/lib/gigaverse/realtime";
import { LiveIndicator } from "@/components/shared/LiveIndicator";
import type { UIMatch, UITournamentFull } from "@/types/ui";

/**
 * League view: matchdays of heats (no elimination) plus a live points table.
 * Mirrors LiveBracket's live behaviour (poll + GigaSocket invalidation).
 */
export function LiveLeague({ initial }: { initial: UITournamentFull }) {
  const queryClient = useQueryClient();
  const { data } = useTournament(initial.id, initial);
  useLobbyChannel(() => {
    queryClient.invalidateQueries({ queryKey: ["tournament", initial.id] });
  });
  const tournament = data ?? initial;

  const giglings = useGiglings(
    tournament.matches.flatMap((m) => m.entries.map((e) => e.petId))
  );

  const matchdays = useMemo(() => {
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
        matches: matches.sort((a, b) => a.position - b.position),
        done: matches.every(
          (m) => m.status === "COMPLETED" || m.status === "BYE"
        ),
      }));
  }, [tournament]);

  if (matchdays.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-text-muted">
        Matchdays appear here once the league starts.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {tournament.status === "IN_PROGRESS" && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <LiveIndicator /> Auto-updating as races resolve
        </div>
      )}

      {/* Live standings */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-text-muted">
          Standings
        </h2>
        <StandingsTable standings={tournament.standings} />
      </div>

      {/* Matchdays */}
      {matchdays.map((d) => (
        <div key={d.round}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">
              Matchday {d.round}
            </h2>
            {d.done && (
              <span className="text-[10px] font-semibold uppercase text-primary">
                Complete
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.matches.map((m) => (
              <div key={m.id} className="space-y-1">
                <MatchCard
                  match={m}
                  giglings={giglings}
                  href={`/tournaments/${tournament.id}/matches/${m.id}`}
                />
                <HeatControl match={m} tournament={tournament} />
                <CopyWalletsButton
                  addresses={m.entries.map((e) => e.user.walletAddress)}
                  managers={[tournament.host.walletAddress, ...tournament.coHosts]}
                  className="px-1"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
