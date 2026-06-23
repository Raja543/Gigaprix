"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { simulateHeatAction } from "@/actions/match";
import type { UIMatch, UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

/**
 * Host-only, test-mode-only: resolve this heat with a random finishing order,
 * no on-chain race required.
 */
export function SimulateHeatButton({
  match,
  tournament,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHost = isManager(tournament, address);
  if (!tournament.testMode || !isHost) return null;
  if (match.status === "COMPLETED" || match.status === "BYE") return null;
  if (match.entries.length === 0) return null;

  async function simulate() {
    setBusy(true);
    setMsg(null);
    const res = await simulateHeatAction(match.id, address!);
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
        <FlaskConical className="h-4 w-4" /> Test mode
      </div>
      <p className="mb-2 text-xs text-text-muted">
        Resolve this heat with a simulated finishing order - no on-chain race
        needed.
      </p>
      <Button size="sm" variant="outline" onClick={simulate} disabled={busy}>
        {busy ? "Simulating…" : "Simulate heat result"}
      </Button>
      {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
    </div>
  );
}
