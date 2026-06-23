import { Clock } from "lucide-react";

function fmt(d: Date, timeZone?: string, withDate = true) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    ...(withDate ? { day: "2-digit", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Shows a scheduled stage time in the viewer's local timezone plus UTC and IST.
 * The local line uses the browser timezone after hydration; UTC/IST are fixed.
 */
export function StageTime({
  iso,
  compact = false,
}: {
  iso?: string | null;
  compact?: boolean;
}) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() <= 0) return null;

  const local = fmt(d);
  const utc = fmt(d, "UTC", false);
  const ist = fmt(d, "Asia/Kolkata", false);
  const title = `Local: ${local}\nUTC: ${utc}\nIST: ${ist}`;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-accent"
        title={title}
        suppressHydrationWarning
      >
        <Clock className="h-3 w-3" />
        {local}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-accent">
      <span className="inline-flex items-center gap-1" suppressHydrationWarning>
        <Clock className="h-3.5 w-3.5" />
        {local} <span className="text-text-dim">(your time)</span>
      </span>
      <span className="text-xs text-text-dim">
        {utc} UTC · {ist} IST
      </span>
    </span>
  );
}
