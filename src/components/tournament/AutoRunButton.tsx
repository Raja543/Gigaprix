"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { simulateTournamentAction } from "@/actions/match";
import type { UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

/**
 * Host-only, test-mode-only: simulate all remaining heats to a champion in one
 * click. The fastest way to demo a full tournament.
 */
export function AutoRunButton({ tournament }: { tournament: UITournamentFull }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHost = isManager(tournament, address);
  if (!tournament.testMode || !isHost) return null;
  if (tournament.status !== "IN_PROGRESS") return null;

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await simulateTournamentAction(tournament.id, address!);
    setBusy(false);
    if (res.ok) {
      setMsg(`Simulated ${res.data.simulated} heat(s).`);
      queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
      router.refresh();
    } else {
      setMsg(res.error ?? "Failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
      <FlaskConical className="h-4 w-4 text-warning" />
      <span className="text-sm text-text-muted">
        Test mode - simulate the rest of the tournament:
      </span>
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>
        <Play className="h-4 w-4" />
        {busy ? "Simulating…" : "Auto-run to champion"}
      </Button>
      {msg && <span className="text-sm text-primary">{msg}</span>}
    </div>
  );
}
