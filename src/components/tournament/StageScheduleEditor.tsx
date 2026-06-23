"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { setStageScheduleAction } from "@/actions/tournament";
import { roundLabel } from "@/lib/tournament/single-elimination";
import type { UITournamentFull } from "@/types/ui";
import { isManager } from "@/lib/permissions";

/** ISO string -> value for <input type="datetime-local"> in local time. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (d.getTime() <= 0) return "";
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

/** "14:00 UTC · 19:30 IST" for a local datetime-local value. */
function zonePreview(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  const f = (tz: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  return `${f("UTC")} UTC · ${f("Asia/Kolkata")} IST`;
}

/**
 * Host-only: schedule a date/time for each stage. Giglings can only race a
 * couple of times per day, so spacing stages out keeps the field eligible.
 */
export function StageScheduleEditor({
  tournament,
}: {
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isHost = isManager(tournament, address);
  const stages = tournament.totalRounds || 0;
  const [dates, setDates] = useState<string[]>(
    Array.from({ length: stages }, (_, i) =>
      toLocalInput(tournament.stageDates?.[i])
    )
  );

  if (!isHost || stages === 0) return null;

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await setStageScheduleAction(
      tournament.id,
      address!,
      dates.map((d) => (d ? new Date(d).toISOString() : null))
    );
    setBusy(false);
    if (res.ok) {
      setMsg("Schedule saved.");
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
          <CalendarClock className="h-4 w-4 text-accent" /> Stage schedule
        </span>
        <span className="text-xs text-text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-text-muted">
            Giglings can only race 2-3 times per day. Set a date and time for each
            stage so racers know when to show up.
          </p>
          <div className="space-y-2">
            {Array.from({ length: stages }, (_, i) => {
              const preview = zonePreview(dates[i] ?? "");
              return (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-24 shrink-0 text-sm font-medium">
                    {roundLabel(i + 1, stages)}
                  </span>
                  <input
                    type="datetime-local"
                    value={dates[i] ?? ""}
                    onChange={(e) =>
                      setDates((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    className="min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  {preview && (
                    <span className="font-mono text-[11px] text-text-dim">
                      {preview}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save schedule
            </Button>
            {msg && <span className="text-sm text-primary">{msg}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
