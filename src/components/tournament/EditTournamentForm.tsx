"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { updateTournamentAction } from "@/actions/tournament";
import { RACE_TYPES } from "@/lib/competition";
import { cn } from "@/lib/utils";
import type { UITournamentFull } from "@/types/ui";

export function EditTournamentForm({ tournament: t }: { tournament: UITournamentFull }) {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const preStart = t.status === "DRAFT" || t.status === "REGISTRATION";
  const isHost = !!address && address === t.host.walletAddress;

  const [form, setForm] = useState({
    name: t.name,
    description: t.description ?? "",
    accentColor: t.accentColor ?? "#19f7a4",
    isPublic: t.isPublic,
    raceType: t.raceType,
    maxParticipants: t.maxParticipants,
    heatSize: t.heatSize,
    advanceCount: t.advanceCount,
    advancePerRound: t.advancePerRound.join(", "),
    testMode: t.testMode,
    whitelistEnabled: t.whitelistEnabled,
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!isConnected) return connect();
    setBusy(true);
    setMsg(null);
    const res = await updateTournamentAction(t.id, address!, {
      name: form.name,
      description: form.description || null,
      accentColor: form.accentColor,
      isPublic: form.isPublic,
      ...(preStart
        ? {
            raceType: form.raceType,
            maxParticipants: form.maxParticipants,
            heatSize: form.heatSize,
            advanceCount: form.advanceCount,
            advancePerRound: form.advancePerRound
              .split(/[\s,]+/)
              .map((s) => parseInt(s, 10))
              .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7),
            testMode: form.testMode,
            whitelistEnabled: form.whitelistEnabled,
          }
        : {}),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Saved." });
      router.push(`/tournaments/${t.id}`);
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  if (isConnected && !isHost) {
    return (
      <Card className="py-12 text-center text-text-muted">
        Only the host can edit this tournament.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/tournaments/${t.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tournament
      </Link>

      <Card className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="accent">Accent</Label>
            <input
              id="accent"
              type="color"
              value={form.accentColor}
              onChange={(e) => update("accentColor", e.target.value)}
              className="mt-1.5 h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface"
            />
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => update("isPublic", e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Public
          </label>
        </div>

        {preStart ? (
          <div className="space-y-4 rounded-lg border border-border bg-surface/40 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
              Rules (editable before start)
            </div>
            <div>
              <Label>Race Type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RACE_TYPES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update("raceType", r.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center",
                      form.raceType === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-muted hover:text-text"
                    )}
                  >
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="font-mono text-[11px] text-text-dim">{r.distance}m</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="max">Number of Racers</Label>
                <Input
                  id="max"
                  type="number"
                  min={2}
                  value={form.maxParticipants}
                  onChange={(e) => update("maxParticipants", Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="heat">Max Racers / Heat</Label>
                <Input
                  id="heat"
                  type="number"
                  min={2}
                  max={8}
                  value={form.heatSize}
                  onChange={(e) => update("heatSize", Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="adv">Default Advance / Heat</Label>
                <Input
                  id="adv"
                  type="number"
                  min={1}
                  max={form.heatSize - 1}
                  value={form.advanceCount}
                  onChange={(e) => update("advanceCount", Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="apr">Qualifiers per Stage (optional)</Label>
              <Input
                id="apr"
                value={form.advancePerRound}
                onChange={(e) => update("advancePerRound", e.target.value)}
                placeholder="e.g. 4, 2, 1"
                className="mt-1.5"
              />
              <span className="text-[10px] text-text-dim">
                Comma-separated top-N per stage. Blank = use default advance.
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.testMode}
                  onChange={(e) => update("testMode", e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Test mode
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.whitelistEnabled}
                  onChange={(e) => update("whitelistEnabled", e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Whitelist only
              </label>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-surface/40 p-3 text-xs text-text-muted">
            Rules are locked once the competition has started. You can still edit
            name, description, branding, and visibility.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : isConnected ? "Save changes" : "Connect & Save"}
          </Button>
          {msg && (
            <span className={msg.ok ? "text-sm text-primary" : "text-sm text-danger"}>
              {msg.text}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
