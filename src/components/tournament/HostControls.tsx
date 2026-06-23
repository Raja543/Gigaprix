"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, Users, ListPlus, FlaskConical, X, Pencil, Link2, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import {
  addCoHostsAction,
  addParticipantsAction,
  removeCoHostAction,
  removeParticipantAction,
  setRegistrationOpenAction,
  updateWhitelistAction,
} from "@/actions/tournament";
import { displayName, truncateAddress } from "@/lib/utils";
import type { UITournamentFull } from "@/types/ui";
import { isManager, isPrimaryHost } from "@/lib/permissions";

/**
 * Host-only control panel: bulk-add participants (great for filling a test
 * tournament), and manage the whitelist. Only rendered for the host.
 */
export function HostControls({ tournament }: { tournament: UITournamentFull }) {
  const router = useRouter();
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [participantsText, setParticipantsText] = useState("");
  const [whitelistText, setWhitelistText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [coHostText, setCoHostText] = useState("");

  const manager = isManager(tournament, address);
  const primary = isPrimaryHost(tournament, address);
  // Pre-start controls (add/remove participants, registration, whitelist).
  const manageable =
    tournament.status === "REGISTRATION" || tournament.status === "DRAFT";
  // The panel itself shows for any manager at any status so the primary host can
  // always manage co-hosts; pre-start-only sections are gated by `manageable`.
  if (!manager) return null;

  async function addCoHosts() {
    const addrs = coHostText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (addrs.length === 0) return;
    setBusy("cohost");
    setMsg(null);
    const res = await addCoHostsAction(tournament.id, address!, addrs);
    setBusy(null);
    if (res.ok) {
      setMsg(`Added ${res.data.added} co-host(s).`);
      setCoHostText("");
      router.refresh();
    } else {
      setMsg(res.error);
    }
  }

  async function removeCoHost(addr: string) {
    setBusy(`corm-${addr}`);
    setMsg(null);
    const res = await removeCoHostAction(tournament.id, address!, addr);
    setBusy(null);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  async function toggleRegistration() {
    setBusy("reg");
    setMsg(null);
    const res = await setRegistrationOpenAction(
      tournament.id,
      address!,
      tournament.status === "DRAFT"
    );
    setBusy(null);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  function parseAddrs(text: string): string[] {
    return text
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function addParticipants() {
    const addrs = parseAddrs(participantsText);
    if (addrs.length === 0) return;
    setBusy("participants");
    setMsg(null);
    const res = await addParticipantsAction(tournament.id, address!, addrs);
    setBusy(null);
    if (res.ok) {
      setMsg(`Added ${res.data.added}, skipped ${res.data.skipped}.`);
      setParticipantsText("");
      router.refresh();
    } else {
      setMsg(res.error);
    }
  }

  async function removeParticipant(participantId: string) {
    setBusy(`rm-${participantId}`);
    setMsg(null);
    const res = await removeParticipantAction(participantId, address!);
    setBusy(null);
    if (res.ok) router.refresh();
    else setMsg(res.error ?? "Failed");
  }

  async function addWhitelist() {
    const addrs = parseAddrs(whitelistText);
    if (addrs.length === 0) return;
    setBusy("whitelist");
    setMsg(null);
    const res = await updateWhitelistAction(tournament.id, address!, addrs);
    setBusy(null);
    if (res.ok) {
      setMsg(`Whitelisted ${addrs.length} wallet(s).`);
      setWhitelistText("");
      router.refresh();
    } else {
      setMsg(res.error ?? "Failed");
    }
  }

  return (
    <Card className="border-accent/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Settings className="h-4 w-4 text-accent" /> Host Controls
        </span>
        <span className="text-xs text-text-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Link href={`/tournaments/${tournament.id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="h-4 w-4" /> Edit settings
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {copied ? "Copied" : "Copy invite link"}
            </Button>
            {manageable && (
              <Button
                size="sm"
                variant={tournament.status === "DRAFT" ? "primary" : "outline"}
                onClick={toggleRegistration}
                disabled={busy !== null}
              >
                {tournament.status === "DRAFT"
                  ? "Open registration"
                  : "Close registration"}
              </Button>
            )}
          </div>
          {tournament.status === "DRAFT" && (
            <p className="text-xs text-warning">
              This tournament is a draft - open registration so players can join.
            </p>
          )}

          {tournament.testMode && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
              <FlaskConical className="h-4 w-4" />
              Test mode is on - you can simulate heat results from each heat page
              or use Auto-run on the bracket.
            </div>
          )}

          {tournament.participants.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" /> Participants (
                {tournament.participants.length})
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {tournament.participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-surface"
                  >
                    <span className="truncate">
                      {displayName(p.user)}
                      <span className="ml-2 font-mono text-xs text-text-dim">
                        {truncateAddress(p.user.walletAddress, 3)}
                      </span>
                      {p.petId && (
                        <span className="ml-2 font-mono text-[10px] text-text-dim">
                          #{p.petId}
                        </span>
                      )}
                    </span>
                    {manageable && (
                      <button
                        onClick={() => removeParticipant(p.id)}
                        disabled={busy !== null}
                        className="shrink-0 rounded p-1 text-text-dim hover:bg-danger/15 hover:text-danger"
                        title="Remove participant"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {manageable && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                <ListPlus className="h-4 w-4" /> Add participants (wallets)
              </div>
              <p className="mb-2 text-xs text-text-muted">
                Paste wallet addresses (comma/space/newline separated). Useful for
                filling a test competition.
              </p>
              <Textarea
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
                placeholder="0xabc…&#10;0xdef…"
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={addParticipants}
                disabled={busy !== null}
              >
                <Users className="h-4 w-4" />
                {busy === "participants" ? "Adding…" : "Add participants"}
              </Button>
            </div>
          )}

          {/* Co-hosts (primary host only) */}
          {primary && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-accent" /> Co-hosts ({tournament.coHosts.length})
              </div>
              <p className="mb-2 text-xs text-text-muted">
                Co-hosts can manage everything except cancelling the competition
                and editing this list.
              </p>
              {tournament.coHosts.length > 0 && (
                <div className="mb-2 space-y-1 rounded-lg border border-border p-2">
                  {tournament.coHosts.map((c) => (
                    <div
                      key={c}
                      className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-surface"
                    >
                      <span className="font-mono text-xs text-text-muted">
                        {truncateAddress(c, 5)}
                      </span>
                      <button
                        onClick={() => removeCoHost(c)}
                        disabled={busy !== null}
                        className="shrink-0 rounded p-1 text-text-dim hover:bg-danger/15 hover:text-danger"
                        title="Remove co-host"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                value={coHostText}
                onChange={(e) => setCoHostText(e.target.value)}
                placeholder="0xabc…&#10;0xdef…"
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={addCoHosts}
                disabled={busy !== null}
              >
                <Shield className="h-4 w-4" />
                {busy === "cohost" ? "Adding…" : "Add co-hosts"}
              </Button>
            </div>
          )}

          {manageable && tournament.whitelistEnabled && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                <ListPlus className="h-4 w-4" /> Whitelist wallets
              </div>
              <Textarea
                value={whitelistText}
                onChange={(e) => setWhitelistText(e.target.value)}
                placeholder="0xabc…&#10;0xdef…"
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={addWhitelist}
                disabled={busy !== null}
              >
                {busy === "whitelist" ? "Saving…" : "Add to whitelist"}
              </Button>
            </div>
          )}

          {msg && <p className="text-sm text-primary">{msg}</p>}
        </div>
      )}
    </Card>
  );
}
