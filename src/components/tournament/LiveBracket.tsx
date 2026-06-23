"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BracketView } from "./BracketView";
import { useTournament } from "@/hooks/useTournament";
import { useLobbyChannel } from "@/lib/gigaverse/realtime";
import { LiveIndicator } from "@/components/shared/LiveIndicator";
import type { UITournamentFull } from "@/types/ui";

/**
 * Client wrapper that keeps the bracket fresh: polls while live and refetches
 * immediately when the GigaSocket lobby reports a race update.
 */
export function LiveBracket({ initial }: { initial: UITournamentFull }) {
  const queryClient = useQueryClient();
  const { data } = useTournament(initial.id, initial);

  useLobbyChannel(() => {
    queryClient.invalidateQueries({ queryKey: ["tournament", initial.id] });
  });

  const tournament = data ?? initial;

  return (
    <div className="space-y-4">
      {tournament.status === "IN_PROGRESS" && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <LiveIndicator /> Auto-updating as races resolve
        </div>
      )}
      <BracketView tournament={tournament} />
    </div>
  );
}
