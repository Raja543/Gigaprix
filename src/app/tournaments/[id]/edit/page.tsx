import { notFound } from "next/navigation";
import { getTournamentFull } from "@/lib/queries";
import { EditTournamentForm } from "@/components/tournament/EditTournamentForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditTournamentPage({ params }: { params: Params }) {
  const { id } = await params;
  const tournament = await getTournamentFull(id);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Edit Tournament</h1>
      <p className="mb-6 text-sm text-text-muted">{tournament.name}</p>
      <EditTournamentForm tournament={tournament} />
    </div>
  );
}
