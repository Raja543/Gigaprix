import Link from "next/link";
import { Users, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TournamentStatusBadge } from "@/components/shared/StatusBadge";
import { LiveIndicator } from "@/components/shared/LiveIndicator";
import { RaceTypeIcon } from "@/components/shared/RaceTypeIcon";
import { truncateAddress } from "@/lib/utils";
import { raceTypeMeta, formatLabel } from "@/lib/competition";
import type { UITournamentCard } from "@/types/ui";

export function TournamentCard({ tournament }: { tournament: UITournamentCard }) {
  const isLive = tournament.status === "IN_PROGRESS";
  const accent = tournament.accentColor ?? "#19f7a4";
  const race = raceTypeMeta(tournament.raceType);

  return (
    <Link href={`/tournaments/${tournament.id}`}>
      <Card className="neon-edge clip-chassis group relative flex h-full flex-col overflow-hidden rounded-xl">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
        />
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {formatLabel(tournament.format)}
            </span>
          </div>
          {isLive ? <LiveIndicator /> : <TournamentStatusBadge status={tournament.status} />}
        </div>

        <h3 className="mb-1 text-lg font-bold tracking-tight group-hover:text-primary">
          {tournament.name}
        </h3>
        {tournament.description && (
          <p className="mb-4 line-clamp-2 text-sm text-text-muted">
            {tournament.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="flex items-center gap-3 text-text-muted">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="stat-number">
                {tournament._count.participants}/{tournament.maxParticipants}
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs text-text-dim">
              <RaceTypeIcon type={tournament.raceType} />
              {race.label}
            </span>
          </span>
          {tournament.status === "COMPLETED" ? (
            <span className="flex items-center gap-1.5 text-gold">
              <Trophy className="h-4 w-4" /> Champion crowned
            </span>
          ) : (
            <span className="text-text-dim">
              host {truncateAddress(tournament.host.walletAddress, 3)}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
