import { Sparkles, Zap, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { winRate } from "@/lib/utils";
import type { UIGigling } from "@/types/ui";

export function RarityBadge({
  name,
  color,
}: {
  name?: string | null;
  color?: string | null;
}) {
  if (!name) return null;
  const c = color ?? "#9aa0aa";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: c, background: `${c}1f`, border: `1px solid ${c}55` }}
    >
      {name}
    </span>
  );
}

export function GiglingCard({ gigling }: { gigling: UIGigling }) {
  const g = gigling;
  const total = (g.wins ?? 0) + (g.losses ?? 0);
  const rarityColor = g.rarityColor ?? "#9aa0aa";

  return (
    <Card
      className="glass-hover overflow-hidden p-0"
      style={{ borderColor: `${rarityColor}55` }}
    >
      <div className="flex items-center gap-3 p-4">
        {g.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.imageUrl}
            alt={g.name ?? `Gigling #${g.petId}`}
            className="h-14 w-14 rounded-lg border border-border object-cover"
          />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg border border-border"
            style={{ background: `${rarityColor}22` }}
          >
            <Sparkles className="h-6 w-6" style={{ color: rarityColor }} />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold">
            {g.name ?? `Gigling #${g.petId}`}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <RarityBadge name={g.rarityName} color={g.rarityColor} />
            {g.factionName && (
              <span className="text-[10px] text-text-muted">{g.factionName}</span>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-border p-3 text-center">
        <Stat
          label="ELO"
          value={g.elo ?? "-"}
          icon={<Zap className="h-3 w-3 text-accent" />}
        />
        <Stat
          label="Win %"
          value={total ? winRate(g.wins ?? 0, total) : "-"}
          icon={<Trophy className="h-3 w-3 text-gold" />}
        />
        <Stat label="Races" value={total || "-"} />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2 py-2">
      <div className="stat-number flex items-center justify-center gap-1 text-lg font-bold">
        {icon}
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-text-muted">
        {label}
      </div>
    </div>
  );
}
