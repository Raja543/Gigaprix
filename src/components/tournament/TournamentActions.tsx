"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, UserPlus, X, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import {
  cancelTournamentAction,
  joinTournamentAction,
  startTournamentAction,
} from "@/actions/tournament";
import { isManager, isPrimaryHost } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { UITournamentFull } from "@/types/ui";

export function TournamentActions({
  tournament,
}: {
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  function copyInvite() {
    navigator.clipboard.writeText(window.location.href);
    setInvited(true);
    toast("Invite link copied to clipboard.", "success");
    setTimeout(() => setInvited(false), 1800);
  }

  const SUCCESS: Record<string, string> = {
    join: "You're in! Pick your gigling when your heat goes live.",
    start: "Competition started - stages generated.",
    cancel: "Competition cancelled.",
  };

  const manager = isManager(tournament, address);
  const primary = isPrimaryHost(tournament, address);
  const isParticipant = address
    ? tournament.participants.some((p) => p.user.walletAddress === address)
    : false;
  const isFull = tournament.participants.length >= tournament.maxParticipants;
  const isRegistration = tournament.status === "REGISTRATION";

  async function run(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>
  ) {
    if (!isConnected) return connect();
    setBusy(label);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (res.ok) {
      toast(SUCCESS[label] ?? "Done.", "success");
      router.refresh();
    } else {
      const msg = res.error ?? "Something went wrong";
      setError(msg);
      toast(msg, "error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Host/co-host: invite + start + cancel */}
        {isRegistration && manager && (
          <Button variant="accent" onClick={copyInvite}>
            {invited ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {invited ? "Invite link copied" : "Invite players"}
          </Button>
        )}

        {/* Player: one-click join with just a wallet */}
        {isRegistration && !manager && !isParticipant && (
          <Button
            disabled={busy !== null || isFull}
            onClick={() =>
              run("join", () => joinTournamentAction(tournament.id, address!))
            }
          >
            <UserPlus className="h-4 w-4" />
            {isFull ? "Full" : busy === "join" ? "Joining…" : "Join competition"}
          </Button>
        )}

        {isRegistration && manager && (
          <Button
            variant="accent"
            disabled={busy !== null || tournament.participants.length < 2}
            onClick={() =>
              run("start", () => startTournamentAction(tournament.id, address!))
            }
          >
            <Play className="h-4 w-4" />
            {busy === "start" ? "Starting…" : "Start competition"}
          </Button>
        )}

        {primary && (isRegistration || tournament.status === "DRAFT") && (
          <Button
            variant="danger"
            disabled={busy !== null}
            onClick={() =>
              run("cancel", () => cancelTournamentAction(tournament.id, address!))
            }
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        )}
      </div>

      {isParticipant && isRegistration && (
        <p className="text-sm text-primary">
          You&apos;re registered. Pick your gigling when your heat&apos;s race goes live.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
