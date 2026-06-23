"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { reopenHeatAction } from "@/actions/match";
import type { UIMatch, UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

/** Host-only: reopen a completed heat to re-run it (fix a wrong result). */
export function ReopenHeatButton({
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
  if (!isHost || match.status !== "COMPLETED") return null;

  async function reopen() {
    setBusy(true);
    setMsg(null);
    const res = await reopenHeatAction(match.id, address!);
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onClick={reopen} disabled={busy}>
        <RotateCcw className="h-4 w-4" />
        {busy ? "Reopening…" : "Reopen heat"}
      </Button>
      {msg && <span className="text-sm text-danger">{msg}</span>}
    </div>
  );
}
