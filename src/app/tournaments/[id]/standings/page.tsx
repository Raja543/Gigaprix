import { notFound } from "next/navigation";
import { getTournamentFull } from "@/lib/queries";
import { fetchGiglingsByIds } from "@/lib/gigaverse/api";
import { TournamentTabs } from "@/components/tournament/TournamentTabs";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import type { UIGigling } from "@/types/ui";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function StandingsPage({ params }: { params: Params }) {
  const { id } = await params;
  const tournament = await getTournamentFull(id);
  if (!tournament) notFound();

  // Each player's representative gigling: the pet they actually raced (latest
  // entry with a petId), falling back to their registered petId.
  const petByUser = new Map<string, string>();
  for (const p of tournament.participants) {
    if (p.petId) petByUser.set(p.userId, p.petId);
  }
  for (const m of tournament.matches) {
    for (const e of m.entries) {
      if (e.petId) petByUser.set(e.userId, e.petId);
    }
  }

  const map = await fetchGiglingsByIds(
    [...petByUser.values()].map((p) => BigInt(p))
  ).catch(() => new Map());

  const giglingByUser: Record<string, UIGigling> = {};
  for (const [userId, petId] of petByUser) {
    const g = map.get(petId);
    if (g) giglingByUser[userId] = { ...g, petId: g.petId.toString() };
  }

  // Leagues show a live points table throughout; knockouts only publish the
  // final order once a champion is crowned.
  const isLeague = tournament.format === "ROUND_ROBIN";
  const show = isLeague || tournament.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">
        {tournament.name}
      </h1>
      <p className="mb-4 text-sm text-text-muted">
        {isLeague ? "Live league standings" : "Final standings"}
      </p>

      <TournamentTabs id={tournament.id} />

      <div className="mt-6">
        {show ? (
          <StandingsTable
            standings={tournament.standings}
            giglings={giglingByUser}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-text-muted">
            Final standings are published when the competition finishes.
          </div>
        )}
      </div>
    </div>
  );
}
