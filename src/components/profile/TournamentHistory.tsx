import Link from "next/link";
import { Trophy } from "lucide-react";
import { TournamentStatusBadge } from "@/components/shared/StatusBadge";
import { formatLabel } from "@/lib/competition";
import type { UITournament } from "@/types/ui";

export interface HistoryEntry {
  tournament: UITournament;
  isChampion: boolean;
  placement?: string;
}

export function TournamentHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-text-muted">
        No tournament history yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3">Competition</th>
            <th className="px-4 py-3">Format</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ tournament, isChampion, placement }) => (
            <tr
              key={tournament.id}
              className="border-b border-border hover:bg-surface"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/tournaments/${tournament.id}`}
                  className="font-medium hover:text-primary"
                >
                  {tournament.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-muted">
                {formatLabel(tournament.format)}
              </td>
              <td className="px-4 py-3">
                <TournamentStatusBadge status={tournament.status} />
              </td>
              <td className="px-4 py-3 text-right">
                {isChampion ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-gold">
                    <Trophy className="h-4 w-4" /> Champion
                  </span>
                ) : (
                  <span className="text-text-muted">{placement ?? "-"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
