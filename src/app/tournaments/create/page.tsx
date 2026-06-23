import { TournamentBuilder } from "@/components/tournament/TournamentBuilder";

export const metadata = {
  title: "Create Competition · GigaPrix",
};

export default function CreateTournamentPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Create a Competition
        </h1>
        <p className="mt-1 text-text-muted">
          Set up your bracket or league. Races stay free - glory is the prize.
        </p>
      </div>
      <TournamentBuilder />
    </div>
  );
}
