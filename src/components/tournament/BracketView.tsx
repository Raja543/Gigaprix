"use client";

import { useMemo } from "react";
import { Trophy, CheckCircle2 } from "lucide-react";
import { MatchCard } from "./MatchCard";
import { HeatControl } from "./HeatControl";
import { CopyWalletsButton } from "./CopyWalletsButton";
import { StageTime } from "@/components/shared/StageTime";
import { roundLabel } from "@/lib/tournament/single-elimination";
import { cn, displayName } from "@/lib/utils";
import { useGiglings } from "@/hooks/useGiglings";
import type { UIMatch, UITournamentFull } from "@/types/ui";

export function BracketView({ tournament }: { tournament: UITournamentFull }) {
  const giglings = useGiglings(
    tournament.matches.flatMap((m) => m.entries.map((e) => e.petId))
  );
  const { rounds, totalRounds, champion } = useMemo(() => {
    const total = tournament.totalRounds;
    const byRound = new Map<number, UIMatch[]>();
    for (const m of tournament.matches) {
      const arr = byRound.get(m.round) ?? [];
      arr.push(m);
      byRound.set(m.round, arr);
    }
    const rounds = [...byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => {
        const ms = matches.sort((a, b) => a.position - b.position);
        const done = ms.every(
          (m) => m.status === "COMPLETED" || m.status === "BYE"
        );
        return {
          round,
          label: roundLabel(round, total),
          matches: ms,
          done,
          dateIso: tournament.stageDates?.[round - 1] ?? null,
        };
      });

    const champ = tournament.championId
      ? tournament.participants.find((p) => p.userId === tournament.championId)
          ?.user ?? null
      : null;

    return { rounds, totalRounds: total, champion: champ };
  }, [tournament]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-text-muted">
        The stages will appear here once the competition starts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {champion && (
        <div className="gradient-border flex items-center justify-center gap-3 p-6 text-center animate-slide-in">
          <Trophy className="h-7 w-7 text-gold" />
          <div>
            <div className="text-xs uppercase tracking-widest text-text-muted">
              Champion
            </div>
            <div className="text-xl font-bold text-gold">
              {displayName(champion)}
            </div>
          </div>
          <Trophy className="h-7 w-7 text-gold" />
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex flex-col gap-6 md:min-w-max md:flex-row md:items-stretch md:gap-5">
          {rounds.map((r, i) => {
            const active = !r.done && (i === 0 || rounds[i - 1].done);
            return (
              <div key={r.round} className="flex w-full shrink-0 flex-col md:w-64">
                {/* Stage header */}
                <div
                  className={cn(
                    "mb-3 rounded-lg border px-3 py-2",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : r.done
                        ? "border-border bg-surface"
                        : "border-border bg-surface/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                        active ? "text-primary" : "text-text-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3.5 w-1.5 -skew-x-12 rounded-[1px]",
                          active
                            ? "bg-primary"
                            : r.done
                              ? "bg-primary/40"
                              : "bg-border"
                        )}
                      />
                      {r.label}
                    </span>
                    {r.done ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : active ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-text-dim">
                    <span>
                      {r.matches.length} group{r.matches.length > 1 ? "s" : ""}
                    </span>
                    {r.dateIso && <StageTime iso={r.dateIso} compact />}
                  </div>
                  {active && (
                    <div className="paddock-line mt-2 h-0.5 w-full rounded-full" />
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {r.matches.map((m) => (
                    <div key={m.id} className="animate-bracket-advance space-y-1">
                      <MatchCard
                        match={m}
                        compact
                        giglings={giglings}
                        isFinal={r.round >= totalRounds}
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
            );
          })}

          {/* Champion column */}
          <div className="flex w-full shrink-0 flex-col md:w-48">
            <div className="mb-3 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-center text-xs font-bold uppercase tracking-widest text-gold">
              Champion
            </div>
            <div className="gradient-border flex h-28 w-full flex-col items-center justify-center gap-1 p-3 text-center">
              <Trophy className="h-6 w-6 text-gold" />
              <span className="text-sm font-bold text-gold">
                {champion ? displayName(champion) : "TBD"}
              </span>
              <span className="text-[10px] text-text-dim">
                {totalRounds} stage{totalRounds > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
