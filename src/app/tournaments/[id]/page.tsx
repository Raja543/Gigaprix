import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, Trophy, Crown } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatLabel } from "@/lib/competition";
import { getTournamentFull } from "@/lib/queries";
import { fetchGiglingsByIds } from "@/lib/gigaverse/api";
import { TournamentTabs } from "@/components/tournament/TournamentTabs";
import { TournamentActions } from "@/components/tournament/TournamentActions";
import { HostControls } from "@/components/tournament/HostControls";
import { RequirementsBanner } from "@/components/tournament/RequirementsBanner";
import { ParticipantCard } from "@/components/tournament/ParticipantCard";
import { TournamentStatusBadge } from "@/components/shared/StatusBadge";
import { Card } from "@/components/ui/card";
import { displayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    select: { name: true, description: true, format: true },
  });
  if (!t) return { title: "Competition · GigaPrix" };
  const label = formatLabel(t.format);
  return {
    title: `${t.name} · GigaPrix`,
    description:
      t.description ?? `${label} on Gigling Racing. Follow the stages live.`,
  };
}

export default async function TournamentOverview({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const tournament = await getTournamentFull(id);
  if (!tournament) notFound();

  const accent = tournament.accentColor ?? "#19f7a4";
  const champion = tournament.championId
    ? tournament.participants.find((p) => p.userId === tournament.championId)?.user
    : null;

  // Enrich participants with their gigling's rarity + ELO (one batch call).
  const petIds = tournament.participants
    .map((p) => p.petId)
    .filter((x): x is string => !!x);
  const giglingMap = await fetchGiglingsByIds(petIds.map((p) => BigInt(p))).catch(
    () => new Map()
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
      {/* Banner */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-border"
        style={{
          background: `linear-gradient(135deg, ${accent}22, transparent 60%)`,
        }}
      >
        <div className="p-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <Trophy className="h-4 w-4" /> {formatLabel(tournament.format)}
            </span>
            <TournamentStatusBadge status={tournament.status} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="mt-2 max-w-2xl text-text-muted">
              {tournament.description}
            </p>
          )}

          {champion && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold">
              <Crown className="h-4 w-4" /> Champion: {displayName(champion)}
            </div>
          )}

          <div className="mt-5">
            <RequirementsBanner tournament={tournament} />
          </div>

          <div className="mt-5 flex flex-wrap gap-6 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {tournament.participants.length}/{tournament.maxParticipants} racers
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(tournament.createdAt).toLocaleDateString()}
            </span>
            <span>
              Host{" "}
              <Link
                href={`/profile/${tournament.host.walletAddress}`}
                className="text-text hover:text-primary"
              >
                {displayName(tournament.host)}
              </Link>
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <TournamentActions tournament={tournament} />
        <HostControls tournament={tournament} />
      </div>

      <TournamentTabs id={tournament.id} />

      {/* Participants */}
      <div className="mt-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-muted">
          Participants ({tournament.participants.length})
        </h2>
        {tournament.participants.length === 0 ? (
          <Card className="py-10 text-center text-text-muted">
            No participants yet. Be the first to join!
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.participants.map((p) => (
              <ParticipantCard
                key={p.id}
                participant={p}
                gigling={p.petId ? giglingMap.get(p.petId) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
