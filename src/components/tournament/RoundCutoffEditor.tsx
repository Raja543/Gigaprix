"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { setRoundAdvanceCountAction } from "@/actions/tournament";
import { roundLabel } from "@/lib/tournament/single-elimination";
import type { UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

function findEditableRound(
  t: UITournamentFull
): { round: number; advanceCount: number } | null {
  if (t.format !== "SINGLE_ELIMINATION") return null;
  const byRound = new Map<number, UITournamentFull["matches"]>();
  for (const m of t.matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  for (const [round, heats] of [...byRound.entries()].sort((a, b) => a[0] - b[0])) {
    const allPending = heats.every((h) => h.status === "PENDING");
    const hasRacers = heats.some((h) => h.entries.length > 0);
    if (allPending && hasRacers && round < t.totalRounds) {
      return { round, advanceCount: heats[0].advanceCount };
    }
  }
  return null;
}

/**
 * Host-only: change how many racers qualify from the active round before its
 * heats run. Adjusting it regenerates the later rounds automatically.
 */
export function RoundCutoffEditor({ tournament }: { tournament: UITournamentFull }) {
  const router = useRouter();
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHost = isManager(tournament, address);

  // The editable round: all heats PENDING, has racers, and not the final round.
  const editable = findEditableRound(tournament);

  const [val, setVal] = useState(editable?.advanceCount ?? 4);

  if (!isHost || !editable || tournament.status !== "IN_PROGRESS") return null;

  async function save() {
    if (!editable) return;
    setBusy(true);
    setMsg(null);
    const res = await setRoundAdvanceCountAction(
      tournament.id,
      address!,
      editable.round,
      val
    );
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
      <SlidersHorizontal className="h-4 w-4 text-accent" />
      <span className="text-sm text-text-muted">
        {roundLabel(editable.round, tournament.totalRounds)} - top
      </span>
      <Input
        type="number"
        min={1}
        max={tournament.heatSize - 1}
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        className="h-9 w-20"
      />
      <span className="text-sm text-text-muted">advance per heat</span>
      <Button size="sm" variant="outline" onClick={save} disabled={busy}>
        <Check className="h-4 w-4" />
        {busy ? "Saving…" : "Update qualifiers"}
      </Button>
      {msg && <span className="text-sm text-danger">{msg}</span>}
    </div>
  );
}
