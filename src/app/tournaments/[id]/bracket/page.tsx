import { notFound } from "next/navigation";
import { getTournamentFull } from "@/lib/queries";
import { TournamentTabs } from "@/components/tournament/TournamentTabs";
import { LiveBracket } from "@/components/tournament/LiveBracket";
import { LiveLeague } from "@/components/tournament/LiveLeague";
import { AutoRunButton } from "@/components/tournament/AutoRunButton";
import { RoundCutoffEditor } from "@/components/tournament/RoundCutoffEditor";
import { StageScheduleEditor } from "@/components/tournament/StageScheduleEditor";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function BracketPage({ params }: { params: Params }) {
  const { id } = await params;
  const tournament = await getTournamentFull(id);
  if (!tournament) notFound();

  const pending =
    tournament.status === "REGISTRATION" || tournament.status === "DRAFT";
  const isLeague = tournament.format === "ROUND_ROBIN";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{tournament.name}</h1>
      <p className="mb-4 text-sm text-text-muted">
        {isLeague
          ? "League matchdays & live standings"
          : "Road to the final - group stages & qualification"}
      </p>

      <TournamentTabs id={tournament.id} />

      <div className="mt-4 space-y-3">
        <StageScheduleEditor tournament={tournament} />
        {!isLeague && <RoundCutoffEditor tournament={tournament} />}
        <AutoRunButton tournament={tournament} />
      </div>

      <div className="mt-6">
        {pending ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-text-muted">
            {isLeague
              ? "Matchdays are generated once the roster fills (or the host starts)."
              : "The stages are generated once the roster fills (or the host starts)."}
          </div>
        ) : isLeague ? (
          <LiveLeague initial={tournament} />
        ) : (
          <LiveBracket initial={tournament} />
        )}
      </div>
    </div>
  );
}
