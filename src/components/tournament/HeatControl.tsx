"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Tv, RefreshCw, Loader2, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  detectLatestRaceAction,
  forceResolveAction,
  submitRaceLinkAction,
} from "@/actions/match";
import type { UIMatch, UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";

const GIGAVERSE_RACING_URL = "https://gigaverse.io/racing";

/**
 * Inline per-heat control on the bracket: create the race on Gigaverse, link it
 * (auto-detected or pasted), spectate, and fetch the result (which advances the
 * stage) - all without leaving the bracket. Host/racer gated.
 */
export function HeatControl({
  match,
  tournament,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { address } = useAccount();
  const [busy, setBusy] = useState<"detect" | "fetch" | "link" | null>(null);
  const [linkId, setLinkId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Refresh both the server tree and the live bracket query so qualifiers for
  // the next stage appear immediately - no manual reload.
  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
    router.refresh();
  }

  const me = address?.toLowerCase();
  const isHost = isManager(tournament, me);
  const isRacer = !!me && match.entries.some((e) => e.user.walletAddress === me);
  const resolved = match.status === "COMPLETED" || match.status === "BYE";

  const canCreate =
    (isHost || isRacer) &&
    match.status === "PENDING" &&
    match.entries.length > 0 &&
    !match.raceId;
  const canWatch = !!match.raceId;
  const canFetch = isHost && !!match.raceId && !resolved;

  if (resolved || (!canCreate && !canWatch && !canFetch)) return null;

  async function detect() {
    if (!address) return;
    setBusy("detect");
    setMsg(null);
    const res = await detectLatestRaceAction(match.id, address);
    setBusy(null);
    if (res.ok) {
      setMsg({ ok: true, text: `Race #${res.data.raceId} linked` });
      toast(`Race #${res.data.raceId} linked to this group.`, "success");
      refreshAll();
    } else {
      setMsg({ ok: false, text: res.error });
      toast(res.error, "error");
    }
  }

  async function fetchResult() {
    if (!address) return;
    setBusy("fetch");
    setMsg(null);
    const res = await forceResolveAction(match.id, address);
    setBusy(null);
    if (res.ok) {
      toast("Result fetched - qualifiers advanced.", "success");
      refreshAll();
    } else {
      const text = res.error ?? "Not resolved yet";
      setMsg({ ok: false, text });
      toast(text, "error");
    }
  }

  async function linkRace() {
    if (!address) return;
    if (!/^\d+$/.test(linkId.trim())) {
      setMsg({ ok: false, text: "Enter a numeric race ID." });
      return;
    }
    setBusy("link");
    setMsg(null);
    const res = await submitRaceLinkAction(match.id, linkId.trim(), address);
    setBusy(null);
    setMsg({
      ok: res.ok,
      text: res.ok ? "Race linked - fetching results…" : res.error ?? "Failed",
    });
    if (res.ok) {
      setLinkId("");
      refreshAll();
    }
  }

  return (
    <div className="space-y-1.5 px-1">
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        {canCreate && (
          <a
            href={GIGAVERSE_RACING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Create on Gigaverse
          </a>
        )}
        {canCreate && (
          <button
            onClick={detect}
            disabled={busy !== null || !address}
            className="inline-flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
          >
            {busy === "detect" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {busy === "detect" ? "Detecting…" : "Fetch race ID"}
          </button>
        )}
        {canWatch && (
          <a
            href={`https://gigaverse.io/racing/race/${match.raceId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            <Tv className="h-3 w-3" /> Spectate
          </a>
        )}
        {canFetch && (
          <button
            onClick={fetchResult}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 text-text-muted hover:text-text disabled:opacity-50"
          >
            {busy === "fetch" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {busy === "fetch" ? "Fetching…" : "Fetch result"}
          </button>
        )}
      </div>

      {/* Paste an existing race ID to link + fetch results */}
      {canCreate && (
        <div className="flex items-center gap-1">
          <Input
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            placeholder="race ID"
            className="h-7 w-24 px-2 py-0 font-mono text-[11px]"
          />
          <button
            onClick={linkRace}
            disabled={busy !== null || !address}
            className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline disabled:opacity-50"
          >
            {busy === "link" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
            {busy === "link" ? "Linking…" : "Link"}
          </button>
        </div>
      )}

      {msg && (
        <p className={msg.ok ? "text-[10px] text-primary" : "text-[10px] text-danger"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
