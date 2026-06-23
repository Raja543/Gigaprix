"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import {
  forceResolveAction,
  submitRaceLinkAction,
} from "@/actions/match";
import type { UIMatch, UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

export function LinkRaceForm({
  match,
  tournament,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const [raceId, setRaceId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isHost = isManager(tournament, address);
  const isRacerInHeat =
    !!address && match.entries.some((e) => e.user.walletAddress === address);
  const canAct = isHost || isRacerInHeat;

  const ready =
    match.entries.length >= 1 &&
    !["COMPLETED", "BYE", "CANCELLED"].includes(match.status);

  if (match.status === "COMPLETED" || match.status === "BYE") {
    return (
      <p className="text-sm text-text-muted">
        This match is resolved. {match.raceId && `Race #${match.raceId}.`}
      </p>
    );
  }

  if (!ready) {
    return (
      <p className="text-sm text-text-muted">
        Waiting for this heat&apos;s racers to be determined before a race can be
        linked.
      </p>
    );
  }

  async function submit() {
    if (!isConnected) return connect();
    if (!/^\d+$/.test(raceId.trim())) {
      setMsg({ ok: false, text: "Enter a valid numeric race ID." });
      return;
    }
    setBusy("link");
    const res = await submitRaceLinkAction(match.id, raceId.trim(), address!);
    setBusy(null);
    setMsg({ ok: res.ok, text: res.ok ? "Race linked!" : res.error });
    if (res.ok) router.refresh();
  }

  async function resolve() {
    if (!isConnected) return connect();
    setBusy("resolve");
    const res = await forceResolveAction(match.id, address!);
    setBusy(null);
    setMsg({ ok: res.ok, text: res.ok ? "Resolved." : res.error });
    if (res.ok) router.refresh();
  }

  if (!canAct) {
    return (
      <p className="text-sm text-text-muted">
        A match participant or the host can link the on-chain race here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={raceId}
          onChange={(e) => setRaceId(e.target.value)}
          placeholder="On-chain race ID"
          className="font-mono"
        />
        <Button onClick={submit} disabled={busy !== null}>
          <Link2 className="h-4 w-4" />
          {busy === "link" ? "Linking…" : "Link Race"}
        </Button>
      </div>

      {match.raceId && isHost && (
        <Button variant="outline" size="sm" onClick={resolve} disabled={busy !== null}>
          <RefreshCw className="h-3.5 w-3.5" />
          {busy === "resolve" ? "Checking…" : "Force re-check result"}
        </Button>
      )}

      {msg && (
        <p className={msg.ok ? "text-sm text-primary" : "text-sm text-danger"}>
          {msg.text}
        </p>
      )}
      <p className="text-xs text-text-dim">
        Create the race on Gigaverse, then paste its ID here. We validate it
        on-chain and track the result automatically.
      </p>
    </div>
  );
}
