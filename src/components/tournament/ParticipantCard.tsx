/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Zap } from "lucide-react";
import { RarityBadge } from "@/components/shared/GiglingCard";
import { displayName, truncateAddress } from "@/lib/utils";

interface ParticipantLike {
  id: string;
  seed: number | null;
  isEliminated: boolean;
  petId: string | null;
  user: {
    walletAddress: string;
    username: string | null;
    elo: number | null;
  };
}

interface GiglingView {
  elo?: number | null;
  rarityName?: string | null;
  rarityColor?: string | null;
  imageUrl?: string | null;
}

export function ParticipantCard({
  participant: p,
  gigling,
}: {
  participant: ParticipantLike;
  gigling?: GiglingView;
}) {
  const elo = gigling?.elo ?? p.user.elo ?? null;
  const ring = gigling?.rarityColor ?? "var(--color-border)";
  const initials = (p.user.username ?? p.user.walletAddress)
    .replace(/^0x/, "")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/profile/${p.user.walletAddress}`} className="group">
      <div className="glass glass-hover relative flex items-center gap-3 overflow-hidden rounded-xl p-3">
        {/* rarity accent wash */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ background: `radial-gradient(60% 80% at 0% 0%, ${ring}, transparent 70%)` }}
        />

        {/* seed badge */}
        {p.seed != null && (
          <span className="stat-number absolute right-2 top-2 z-10 rounded-md border border-border bg-bg/70 px-1.5 text-[10px] text-text-muted">
            #{p.seed}
          </span>
        )}

        {/* avatar / gigling art with rarity ring */}
        <div
          className="relative h-12 w-12 shrink-0 rounded-lg p-[2px]"
          style={{ background: `linear-gradient(135deg, ${ring}, transparent)` }}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[7px] bg-surface-2">
            {gigling?.imageUrl ? (
              <img
                src={gigling.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-sm font-bold text-text-muted">{initials}</span>
            )}
          </div>
        </div>

        {/* identity */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold group-hover:text-primary">
            {displayName(p.user)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {gigling?.rarityName ? (
              <RarityBadge name={gigling.rarityName} color={gigling.rarityColor} />
            ) : (
              <span className="font-mono text-[11px] text-text-dim">
                {truncateAddress(p.user.walletAddress, 4)}
              </span>
            )}
            {elo != null && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                <Zap className="h-2.5 w-2.5" /> {elo}
              </span>
            )}
          </div>
        </div>

        {p.isEliminated && (
          <span className="z-10 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-semibold text-danger">
            Out
          </span>
        )}
      </div>
    </Link>
  );
}
