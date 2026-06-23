import Link from "next/link";
import { Trophy, Link2, ChevronUp } from "lucide-react";
import { MatchStatusBadge } from "@/components/shared/StatusBadge";
import { cn, displayName, formatRaceTime } from "@/lib/utils";
import type { UIGigling, UIMatch, UIMatchEntry } from "@/types/ui";

function EntryRow({
  entry,
  advanceCount,
  showPosition,
  gigling,
}: {
  entry: UIMatchEntry;
  advanceCount: number;
  showPosition: boolean;
  gigling?: UIGigling;
}) {
  const isWinner = entry.finishPosition === 1;
  const advanced =
    entry.advanced ||
    (entry.finishPosition !== null && entry.finishPosition <= advanceCount);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 text-sm",
        isWinner && "bg-gold/10",
        !isWinner && advanced && "bg-primary/5"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {showPosition && (
          <span
            className={cn(
              "w-4 shrink-0 text-center font-mono text-xs",
              isWinner ? "text-gold" : "text-text-dim"
            )}
          >
            {entry.finishPosition ?? "–"}
          </span>
        )}
        {isWinner && <Trophy className="h-3.5 w-3.5 shrink-0 text-gold" />}
        {!isWinner && advanced && showPosition && (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        {gigling?.rarityColor && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: gigling.rarityColor }}
            title={gigling.rarityName ?? undefined}
          />
        )}
        <span className={cn("truncate", isWinner && "font-semibold text-gold")}>
          {displayName(entry.user)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {gigling?.elo != null && (
          <span className="stat-number text-[10px] text-accent" title="ELO">
            {gigling.elo}
          </span>
        )}
        {entry.finishTime ? (
          <span className="stat-number text-xs text-text-muted">
            {formatRaceTime(BigInt(entry.finishTime))}
          </span>
        ) : entry.petId ? (
          <span className="font-mono text-[10px] text-text-dim">
            #{entry.petId}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MatchCard({
  match,
  href,
  compact = false,
  giglings,
  isFinal = false,
}: {
  match: UIMatch;
  href?: string;
  compact?: boolean;
  giglings?: Record<string, UIGigling>;
  isFinal?: boolean;
}) {
  const resolved = match.status === "COMPLETED";
  const entries = [...match.entries].sort((a, b) => {
    if (resolved) return (a.finishPosition ?? 99) - (b.finishPosition ?? 99);
    return (a.seed ?? 99) - (b.seed ?? 99);
  });

  // Top-seeded gigling art for the hover reveal.
  const topArt = entries
    .map((e) => (e.petId ? giglings?.[e.petId]?.imageUrl : undefined))
    .find((u): u is string => !!u);

  const body = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/50",
        compact ? "w-full md:w-60" : "w-full"
      )}
    >
      {topArt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={topArt}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-[0.14]"
        />
      )}
      <div className="relative">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          {isFinal ? "Final" : `Group ${match.position + 1}`} · {entries.length}{" "}
          racers
        </span>
        <MatchStatusBadge status={match.status} />
      </div>

      {entries.length === 0 ? (
        <div className="px-3 py-3 text-xs text-text-dim">Awaiting racers…</div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              advanceCount={match.advanceCount}
              showPosition={resolved}
              gigling={e.petId ? giglings?.[e.petId] : undefined}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px]">
        <span className="text-text-dim">
          {isFinal
            ? "Winner takes the title"
            : match.advanceCount > 0
              ? `Top ${match.advanceCount} qualify`
              : "Group"}
        </span>
        {match.raceId && (
          <span className="flex items-center gap-1 text-accent">
            <Link2 className="h-3 w-3" /> race #{match.raceId}
          </span>
        )}
      </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
