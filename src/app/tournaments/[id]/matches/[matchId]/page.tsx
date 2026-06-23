import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, ExternalLink, Flag, ChevronUp } from "lucide-react";
import { getTournamentFull } from "@/lib/queries";
import { fetchGiglingsByIds } from "@/lib/gigaverse/api";
import { MatchStatusBadge } from "@/components/shared/StatusBadge";
import { RarityBadge } from "@/components/shared/GiglingCard";
import { AutoRefresh } from "@/components/shared/AutoRefresh";
import { StageTime } from "@/components/shared/StageTime";
import { LinkRaceForm } from "@/components/tournament/LinkRaceForm";
import { SimulateHeatButton } from "@/components/tournament/SimulateHeatButton";
import { ManualResultForm } from "@/components/tournament/ManualResultForm";
import { ReopenHeatButton } from "@/components/tournament/ReopenHeatButton";
import { CreateRaceForm } from "@/components/tournament/CreateRaceForm";
import { UnlinkRaceButton } from "@/components/tournament/UnlinkRaceButton";
import { CopyWalletsButton } from "@/components/tournament/CopyWalletsButton";
import { JoinRaceButton } from "@/components/tournament/JoinRaceButton";
import { RaceSpectator } from "@/components/tournament/RaceSpectator";
import { Card, CardTitle } from "@/components/ui/card";
import { roundLabel } from "@/lib/tournament/single-elimination";
import { cn, displayName, formatRaceTime, truncateAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string; matchId: string }>;

/** Finish-time delta vs the leader, in seconds (e.g. "+0.24"). */
function deltaSeconds(ms: bigint): string {
  return (Number(ms) / 1000).toFixed(2);
}

export default async function MatchDetailPage({ params }: { params: Params }) {
  const { id, matchId } = await params;
  const tournament = await getTournamentFull(id);
  if (!tournament) notFound();

  const heat = tournament.matches.find((m) => m.id === matchId);
  if (!heat) notFound();

  const isFinal = heat.round >= tournament.totalRounds;
  const resolved = heat.status === "COMPLETED";
  const stageIso = tournament.stageDates?.[heat.round - 1] ?? null;
  const entries = [...heat.entries].sort((a, b) => {
    if (resolved) return (a.finishPosition ?? 99) - (b.finishPosition ?? 99);
    return (a.seed ?? 99) - (b.seed ?? 99);
  });

  const petIds = entries.map((e) => e.petId).filter((x): x is string => !!x);
  const giglings = await fetchGiglingsByIds(petIds.map((p) => BigInt(p))).catch(
    () => new Map()
  );

  // Leader time for live split deltas (broadcast-style telemetry).
  const finishTimes = entries
    .map((e) => (e.finishTime ? BigInt(e.finishTime) : null))
    .filter((t): t is bigint => t !== null);
  const leaderTime = finishTimes.length
    ? finishTimes.reduce((m, t) => (t < m ? t : m))
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Live-refresh group results without a manual reload */}
      {!resolved && <AutoRefresh intervalMs={8000} />}

      <Link
        href={`/tournaments/${tournament.id}/bracket`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" /> Back to stages
      </Link>

      {/* Header card */}
      <div
        className="overflow-hidden rounded-2xl border border-border"
        style={{
          background: `linear-gradient(135deg, ${
            tournament.accentColor ?? "#19f7a4"
          }1f, transparent 70%)`,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              {roundLabel(heat.round, tournament.totalRounds)}
            </div>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
              {isFinal ? "Grand Final" : `Group ${heat.position + 1}`}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span>{entries.length} racers</span>
              <span className="text-text-dim">•</span>
              <span>
                {isFinal
                  ? "winner takes the title"
                  : heat.advanceCount > 0
                    ? `top ${heat.advanceCount} qualify`
                    : "group"}
              </span>
              {stageIso && (
                <>
                  <span className="text-text-dim">•</span>
                  <StageTime iso={stageIso} />
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <MatchStatusBadge status={heat.status} />
            <CopyWalletsButton
              size="sm"
              addresses={entries.map((e) => e.user.walletAddress)}
              managers={[tournament.host.walletAddress, ...tournament.coHosts]}
            />
          </div>
        </div>
      </div>

      {/* Racer grid */}
      <Card className="mt-5 p-0">
        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center text-text-muted">
            Racers are decided once the previous stage resolves.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((e, i) => {
              const isWinner = e.finishPosition === 1;
              const advanced =
                e.advanced ||
                (e.finishPosition !== null &&
                  e.finishPosition <= heat.advanceCount);
              const g = e.petId ? giglings.get(e.petId) : undefined;
              const rank = resolved ? e.finishPosition ?? i + 1 : e.seed ?? i + 1;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
                    isWinner && "bg-gold/10",
                    !isWinner && advanced && resolved && "bg-primary/5"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-sm",
                        isWinner
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : advanced && resolved
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-text-dim"
                      )}
                    >
                      {rank}
                    </span>
                    {isWinner && <Trophy className="h-4 w-4 shrink-0 text-gold" />}
                    {!isWinner && advanced && resolved && (
                      <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/profile/${e.user.walletAddress}`}
                        className={cn(
                          "block truncate font-medium hover:text-primary",
                          isWinner && "text-gold"
                        )}
                      >
                        {displayName(e.user)}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2">
                        {g?.rarityName ? (
                          <RarityBadge name={g.rarityName} color={g.rarityColor} />
                        ) : e.petId ? (
                          <span className="font-mono text-[10px] text-text-dim">
                            gigling #{e.petId}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-text-dim">
                            {truncateAddress(e.user.walletAddress, 3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {g?.elo != null && (
                      <span className="stat-number text-xs text-accent" title="ELO">
                        {g.elo} ELO
                      </span>
                    )}
                    {advanced && resolved && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Qualifies
                      </span>
                    )}
                    {resolved && e.finishTime && (
                      <div className="text-right">
                        <div className="stat-number text-sm text-text">
                          {formatRaceTime(BigInt(e.finishTime))}
                        </div>
                        {leaderTime != null && (
                          <div className="stat-number text-[10px] text-accent">
                            {BigInt(e.finishTime) === leaderTime
                              ? "Leader"
                              : `+${deltaSeconds(BigInt(e.finishTime) - leaderTime)}s`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Host: reopen a resolved heat to re-run it */}
      {resolved && (
        <div className="mt-3">
          <ReopenHeatButton match={heat} tournament={tournament} />
        </div>
      )}

      {/* Test-mode simulate */}
      {tournament.testMode && !resolved && (
        <div className="mt-6">
          <SimulateHeatButton match={heat} tournament={tournament} />
        </div>
      )}

      {/* Race link / result */}
      {!resolved && (
        <Card className="mt-6">
          <CardTitle className="mb-3 flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" /> Race
          </CardTitle>

          {heat.raceId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">Linked race</span>
                <a
                  href={`https://gigaverse.io/racing/race/${heat.raceId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-sm text-accent hover:underline"
                >
                  #{heat.raceId} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <RaceSpectator raceId={heat.raceId} />
              <JoinRaceButton match={heat} tournament={tournament} />
              <LinkRaceForm match={heat} tournament={tournament} />
              <UnlinkRaceButton match={heat} tournament={tournament} />
            </div>
          ) : (
            <div className="space-y-4">
              <CreateRaceForm match={heat} tournament={tournament} />
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
                  or link an existing race
                </p>
                <LinkRaceForm match={heat} tournament={tournament} />
              </div>
            </div>
          )}

          {heat.entries.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <ManualResultForm match={heat} tournament={tournament} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
