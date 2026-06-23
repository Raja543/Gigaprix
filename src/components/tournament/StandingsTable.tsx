import Link from "next/link";
import { Trophy } from "lucide-react";
import { RarityBadge } from "@/components/shared/GiglingCard";
import { cn, displayName } from "@/lib/utils";
import type { UIGigling, UIStanding } from "@/types/ui";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Final overall standings: just the ranked finishing order. */
export function StandingsTable({
  standings,
  giglings,
}: {
  standings: UIStanding[];
  giglings?: Record<string, UIGigling>;
}) {
  if (standings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-text-muted">
        Final standings appear once the competition finishes.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[24rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="w-16 px-4 py-3 font-semibold">Rank</th>
            <th className="px-4 py-3 font-semibold">Player</th>
            <th className="px-4 py-3 text-right font-semibold">ELO</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const leader = i === 0;
            const g = giglings?.[s.userId];
            const elo = g?.elo ?? s.user.elo;
            return (
              <tr
                key={s.id}
                className={cn(
                  "border-b border-border transition-colors hover:bg-surface",
                  leader && "bg-gold/5"
                )}
              >
                <td className="px-4 py-3 text-lg font-bold">
                  {MEDALS[i] ?? (
                    <span className="text-text-muted">{s.rank ?? i + 1}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {leader && <Trophy className="h-4 w-4 text-gold" />}
                    <Link
                      href={`/profile/${s.walletAddress}`}
                      className={cn(
                        "font-medium hover:text-primary",
                        leader && "text-gold"
                      )}
                    >
                      {displayName(s.user)}
                    </Link>
                    {g?.rarityName && (
                      <RarityBadge name={g.rarityName} color={g.rarityColor} />
                    )}
                  </div>
                </td>
                <td className="stat-number px-4 py-3 text-right text-accent">
                  {elo != null ? elo : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
