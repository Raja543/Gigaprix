"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { unlinkRaceAction } from "@/actions/match";
import { isManager } from "@/lib/permissions";
import type { UIMatch, UITournamentFull } from "@/types/ui";

/**
 * Manager-only: detach a wrongly-linked race from a heat (only before it
 * resolves), so a correct race can be linked instead.
 */
export function UnlinkRaceButton({
  match,
  tournament,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address } = useWallet();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isManager(tournament, address)) return null;
  if (!match.raceId || match.status === "COMPLETED" || match.status === "BYE") {
    return null;
  }

  async function unlink() {
    if (!address) return;
    setBusy(true);
    setErr(null);
    const res = await unlinkRaceAction(match.id, address);
    setBusy(false);
    if (res.ok) router.refresh();
    else setErr(res.error ?? "Failed to unlink");
  }

  return (
    <div>
      <button
        onClick={unlink}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-danger disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Unlink className="h-3.5 w-3.5" />
        )}
        Unlink this race
      </button>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
