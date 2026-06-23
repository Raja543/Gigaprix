"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectLatestRaceAction } from "@/actions/match";
import { raceTypeMeta } from "@/lib/competition";
import type { UIMatch, UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

const GIGAVERSE_RACING_URL = "https://gigaverse.io/racing";

/**
 * Create-the-race flow. Opens Gigaverse's own race-creation UI in a new tab,
 * then auto-detects the freshly created race from the wallet's recent races and
 * links it to this heat - no manual race-ID copying.
 */
export function CreateRaceForm({
  match,
  tournament,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address } = useAccount();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isParticipant =
    !!address &&
    match.entries.some((e) => e.user.walletAddress === address.toLowerCase());
  const isHost = isManager(tournament, address);
  const canAct = isHost || isParticipant;
  if (!canAct || match.status === "COMPLETED" || match.status === "BYE") return null;

  const fieldSize = Math.min(8, Math.max(2, match.entries.length || 2));
  const race = raceTypeMeta(tournament.raceType);

  async function detect() {
    if (!address) return;
    setBusy(true);
    setMsg(null);
    const res = await detectLatestRaceAction(match.id, address);
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Linked race #${res.data.raceId}` });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a href={GIGAVERSE_RACING_URL} target="_blank" rel="noreferrer">
          <Button>
            <ExternalLink className="h-4 w-4" /> Create race on Gigaverse
          </Button>
        </a>
        <Button variant="outline" onClick={detect} disabled={busy || !address}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? "Detecting…" : "Fetch my race ID"}
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-surface/40 p-3 text-xs text-text-muted">
        <p className="mb-1.5 font-semibold text-text">How linking works</p>
        <ol className="list-inside list-decimal space-y-1 text-text-dim">
          <li>
            Open Gigaverse and create a {fieldSize}-racer {race.label} (
            {race.distance}m) race <span className="text-text-muted">with this same wallet</span>.
          </li>
          <li>Come back and click <span className="text-text-muted">Fetch my race ID</span>.</li>
          <li>
            We detect your newest race and link it here. If it isn&apos;t found yet,
            wait ~30s for Gigaverse to index it, or paste the race ID below.
          </li>
        </ol>
      </div>
      {msg && (
        <p className={msg.ok ? "text-sm text-primary" : "text-sm text-danger"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
