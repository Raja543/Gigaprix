"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { createTournamentAction } from "@/actions/tournament";
import { generateHeatBracket } from "@/lib/tournament/single-elimination";
import {
  RACE_TYPES,
  FORMATS,
  raceTypeMeta,
  type CompetitionFormat,
  type RaceType,
} from "@/lib/competition";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const STEPS = ["Basics", "Config", "Review"];

/** Parse "4, 2, 1" -> [4,2,1]; ignores blanks/invalid. */
function parseAdvancePerRound(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
}

export function TournamentBuilder() {
  const router = useRouter();
  const { toast } = useToast();
  const { address, isConnected, connect } = useWallet();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    format: "SINGLE_ELIMINATION" as CompetitionFormat,
    raceType: "SPRINT" as RaceType,
    maxParticipants: 16,
    heatSize: 8,
    advanceCount: 4,
    advancePerRound: "",
    accentColor: "#19f7a4",
    isPublic: true,
    // Host controls
    testMode: false,
    whitelistEnabled: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canNext = step === 0 ? form.name.trim().length >= 3 : true;

  const isLeague = form.format === "ROUND_ROBIN";

  // Live preview of how the field splits into stages of groups.
  const bracketPreview = useMemo(() => {
    if (form.format !== "SINGLE_ELIMINATION") return "";
    const n = Math.max(0, form.maxParticipants);
    if (n < 2) return "";
    const apr = parseAdvancePerRound(form.advancePerRound);
    const seeded = Array.from({ length: n }, (_, i) => ({
      participantId: `p${i}`,
      userId: `u${i}`,
      petId: null,
      seed: i + 1,
    }));
    const { heats, totalRounds } = generateHeatBracket(
      seeded,
      form.heatSize,
      apr.length > 0 ? apr : form.advanceCount
    );
    const byRound = new Map<number, number>();
    for (const h of heats) byRound.set(h.round, (byRound.get(h.round) ?? 0) + 1);
    const parts = [...byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([r, c], i, arr) =>
        i === arr.length - 1 ? "Final" : `Stage ${r}: ${c} group${c > 1 ? "s" : ""}`
      );
    return `${totalRounds} stage${totalRounds > 1 ? "s" : ""} - ${parts.join(" → ")}`;
  }, [form.format, form.maxParticipants, form.heatSize, form.advanceCount, form.advancePerRound]);

  async function submit() {
    if (!address) {
      connect();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createTournamentAction({
        name: form.name,
        description: form.description || null,
        format: form.format,
        competitionType: form.isPublic ? "CHAMPIONSHIP" : "CREATOR_CUP",
        raceType: form.raceType,
        maxParticipants: form.maxParticipants,
        heatSize: form.heatSize,
        advanceCount: form.advanceCount,
        advancePerRound: parseAdvancePerRound(form.advancePerRound),
        accentColor: form.accentColor,
        isPublic: form.isPublic,
        testMode: form.testMode,
        whitelistEnabled: form.whitelistEnabled,
        hostAddress: address,
      });
      if (res.ok) {
        toast("Competition created!", "success");
        router.push(`/tournaments/${res.data.id}`);
      } else {
        setError(res.error);
        toast(res.error, "error");
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message.split("\n")[0] : "Failed to create competition";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const race = raceTypeMeta(form.raceType);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold",
                i < step && "border-primary bg-primary text-bg",
                i === step && "border-primary text-primary",
                i > step && "border-border text-text-dim"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm", i === step ? "text-text" : "text-text-dim")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="name">Competition Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Gigaverse Championship"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What's this competition about?"
                className="mt-1.5"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            {/* Format */}
            <div>
              <Label>Format</Label>
              <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FORMATS.map((fmt) => {
                  const selected =
                    fmt.value !== null && form.format === fmt.value;
                  return (
                    <button
                      key={fmt.label}
                      type="button"
                      disabled={!fmt.available}
                      onClick={() => fmt.value && update("format", fmt.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                        !fmt.available &&
                          "cursor-not-allowed opacity-50 hover:border-border"
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-2 font-semibold">
                        {fmt.label}
                        {!fmt.available && (
                          <span className="rounded-full border border-border px-1.5 text-[9px] uppercase text-text-dim">
                            Soon
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-text-muted">{fmt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Race type presets */}
            <div>
              <Label>Race Type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RACE_TYPES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update("raceType", r.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center transition-colors",
                      form.raceType === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-muted hover:border-primary/40"
                    )}
                  >
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="font-mono text-[11px] text-text-dim">{r.distance}m</span>
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-[10px] text-text-dim">{race.desc}</span>
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
                <span className="text-[10px] text-text-dim">
                  Any number ≥ 2. Stages auto-build from the field size.
                </span>
              </div>
              <div>
                <Label htmlFor="heat">Racers per Group</Label>
                <Input
                  id="heat"
                  type="number"
                  min={2}
                  max={8}
                  value={form.heatSize}
                  onChange={(e) => update("heatSize", Number(e.target.value))}
                  className="mt-1.5"
                />
                <span className="text-[10px] text-text-dim">
                  Race cap is 8. Field is split into equal groups.
                </span>
              </div>
            </div>

            {isLeague ? (
              <div className="rounded-lg border border-border bg-surface/40 p-3 text-xs text-text-muted">
                League play: everyone races several matchdays in rotating groups
                of {form.heatSize}. There&apos;s no elimination - the standings
                are decided by points earned from finish positions.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="advance">Default Qualify / Group</Label>
                  <Input
                    id="advance"
                    type="number"
                    min={1}
                    max={form.heatSize - 1}
                    value={form.advanceCount}
                    onChange={(e) => update("advanceCount", Number(e.target.value))}
                    className="mt-1.5"
                  />
                  <span className="text-[10px] text-text-dim">
                    Used for stages not overridden below.
                  </span>
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
                    Comma-separated top-N per stage. Blank = use default.
                  </span>
                </div>
              </div>
            )}

            {bracketPreview && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-text-muted">
                <span className="font-semibold text-primary">Preview · </span>
                {bracketPreview}
              </div>
            )}

            <div>
              <Label htmlFor="accent">Accent Color</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="accent"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-surface"
                />
                <span className="font-mono text-sm text-text-muted">
                  {form.accentColor}
                </span>
              </div>
            </div>

            {/* Visibility: public competition vs private Creator Cup */}
            <div>
              <Label>Visibility</Label>
              <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => update("isPublic", true)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    form.isPublic
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="font-semibold">Public Competition</span>
                  <span className="text-xs text-text-muted">
                    Listed in the browser. Anyone can find and join.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      isPublic: false,
                      whitelistEnabled: true,
                    }))
                  }
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    !form.isPublic
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="font-semibold">Creator Cup · Private</span>
                  <span className="text-xs text-text-muted">
                    Unlisted, invite-only. You whitelist who can race.
                  </span>
                </button>
              </div>
            </div>

            {/* Host controls */}
            <div className="space-y-4 rounded-lg border border-border bg-surface/40 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Host Controls
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.testMode}
                  onChange={(e) => update("testMode", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span>
                  <span className="font-medium">Test mode</span>
                  <span className="block text-xs text-text-muted">
                    Resolve heats by simulation (no on-chain race needed). Run a
                    whole competition solo for testing.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.whitelistEnabled}
                  onChange={(e) => update("whitelistEnabled", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                />
                <span>
                  <span className="font-medium">Whitelist only</span>
                  <span className="block text-xs text-text-muted">
                    Only wallets you add can join. Manage the list after creating.
                  </span>
                </span>
              </label>

              <p className="text-xs text-text-dim">
                Anyone can enter with just their wallet. Players choose which
                gigling to race when each heat&apos;s race goes live.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Review label="Name" value={form.name} />
            <Review
              label="Format"
              value={isLeague ? "League" : "Knockout Championship"}
            />
            <Review label="Race type" value={`${race.label} · ${race.distance}m`} />
            <Review label="Racers" value={String(form.maxParticipants)} />
            <Review label="Racers per Group" value={String(form.heatSize)} />
            {!isLeague && (
              <Review label="Default Qualify" value={`Top ${form.advanceCount}`} />
            )}
            {bracketPreview && <Review label="Stages" value={bracketPreview} />}
            <Review
              label="Visibility"
              value={form.isPublic ? "Public Competition" : "Creator Cup · Private"}
            />
            {!isConnected && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                Connect your wallet to create - you&apos;ll be set as the host.
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Creating…" : isConnected ? "Create Competition" : "Connect & Create"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
