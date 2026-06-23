"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { setHeatResultAction } from "@/actions/match";
import { displayName } from "@/lib/utils";
import type { UIMatch, UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

/**
 * Host-only: manually set a heat's finishing order (disputes / manual control).
 * Reorder the racers top-to-bottom, then apply. Top N advance per the heat's
 * advanceCount.
 */
export function ManualResultForm({
  match,
  tournament,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState(
    [...match.entries].sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHost = isManager(tournament, address);
  if (!isHost) return null;
  if (match.status === "COMPLETED" || match.status === "BYE") return null;
  if (match.entries.length === 0) return null;

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  async function apply() {
    setBusy(true);
    setMsg(null);
    const res = await setHeatResultAction(
      match.id,
      address!,
      order.map((e) => e.participantId)
    );
    setBusy(false);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Set result manually
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 text-sm font-medium">Set finishing order</div>
      <p className="mb-3 text-xs text-text-muted">
        Order racers from 1st (top) to last. Top {match.advanceCount} advance.
      </p>
      <div className="space-y-1">
        {order.map((e, i) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-2 rounded border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-5 text-center font-mono text-xs text-text-dim">
                {i + 1}
              </span>
              <span className="truncate">{displayName(e.user)}</span>
              {e.petId && (
                <span className="font-mono text-[10px] text-text-dim">
                  #{e.petId}
                </span>
              )}
            </span>
            <span className="flex shrink-0 gap-1">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded p-1 text-text-dim hover:bg-surface-2 hover:text-text disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                className="rounded p-1 text-text-dim hover:bg-surface-2 hover:text-text disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={apply} disabled={busy}>
          <Check className="h-4 w-4" />
          {busy ? "Applying…" : "Apply result"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        {msg && <span className="text-sm text-danger">{msg}</span>}
      </div>
    </div>
  );
}
