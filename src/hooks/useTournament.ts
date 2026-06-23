"use client";

import { useQuery } from "@tanstack/react-query";
import type { UITournamentFull } from "@/types/ui";

async function fetchTournament(id: string): Promise<UITournamentFull> {
  const res = await fetch(`/api/tournaments/${id}`);
  if (!res.ok) throw new Error("Failed to load tournament");
  const data = (await res.json()) as { tournament: UITournamentFull };
  return data.tournament;
}

/**
 * Live tournament data. Polls while IN_PROGRESS so brackets/standings update as
 * the cron sync resolves linked races.
 */
export function useTournament(id: string, initialData?: UITournamentFull) {
  return useQuery({
    queryKey: ["tournament", id],
    queryFn: () => fetchTournament(id),
    initialData,
    refetchInterval: (query) =>
      query.state.data?.status === "IN_PROGRESS" ? 7_000 : false,
    refetchOnWindowFocus: true,
  });
}
