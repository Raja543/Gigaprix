"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Plus,
  Wallet,
  Settings,
  Users,
  Flag,
  Trophy,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TournamentStatusBadge } from "@/components/shared/StatusBadge";
import { LiveIndicator } from "@/components/shared/LiveIndicator";
import { raceTypeMeta, formatLabel } from "@/lib/competition";
import type { UITournamentCard } from "@/types/ui";

async function fetchHosted(address: string): Promise<UITournamentCard[]> {
  const res = await fetch(`/api/tournaments?host=${address}&pageSize=48`);
  if (!res.ok) throw new Error("Failed to load");
  const data = (await res.json()) as { tournaments: UITournamentCard[] };
  return data.tournaments;
}

export default function DashboardPage() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const { data, isLoading } = useQuery({
    queryKey: ["hosted", address],
    queryFn: () => fetchHosted(address!),
    enabled: !!address,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 shrink-0 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Host Dashboard
            </h1>
            <p className="text-sm text-text-muted">
              Competitions you host or co-host.
            </p>
          </div>
        </div>
        <Link href="/tournaments/create">
          <Button>
            <Plus className="h-4 w-4" /> Create Competition
          </Button>
        </Link>
      </div>

      {!isConnected ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <Wallet className="h-10 w-10 text-text-dim" />
          <p className="text-text-muted">
            Connect your wallet to manage your competitions.
          </p>
          <Button onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-44 animate-pulse opacity-50" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <Trophy className="h-10 w-10 text-text-dim" />
          <p className="text-text-muted">
            You haven&apos;t created any competitions yet.
          </p>
          <Link href="/tournaments/create">
            <Button>Create your first</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <HostedCard key={t.id} tournament={t} viewer={address} />
          ))}
        </div>
      )}
    </div>
  );
}

function HostedCard({
  tournament: t,
  viewer,
}: {
  tournament: UITournamentCard;
  viewer?: string;
}) {
  const isLive = t.status === "IN_PROGRESS";
  const canEdit = t.status === "DRAFT" || t.status === "REGISTRATION";
  const accent = t.accentColor ?? "#19f7a4";
  const race = raceTypeMeta(t.raceType);
  const isCoHost =
    !!viewer && t.host.walletAddress.toLowerCase() !== viewer.toLowerCase();

  return (
    <Card className="relative flex h-full flex-col overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent }}
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <Trophy className="h-3.5 w-3.5 text-primary" /> {formatLabel(t.format)}
        </span>
        <div className="flex items-center gap-1.5">
          {!t.isPublic && (
            <span className="rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-text-muted">
              Private
            </span>
          )}
          {isCoHost && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-accent">
              Co-host
            </span>
          )}
          {isLive ? (
            <LiveIndicator />
          ) : (
            <TournamentStatusBadge status={t.status} />
          )}
        </div>
      </div>

      <Link
        href={`/tournaments/${t.id}`}
        className="line-clamp-1 text-lg font-bold tracking-tight hover:text-primary"
      >
        {t.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span className="stat-number">
            {t._count.participants}/{t.maxParticipants}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-text-dim">
          <Flag className="h-3.5 w-3.5" /> {race.label} · {race.distance}m
        </span>
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-3">
        <Link href={`/tournaments/${t.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Manage
          </Button>
        </Link>
        {canEdit && (
          <Link href={`/tournaments/${t.id}/edit`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full">
              <Settings className="h-4 w-4" /> Edit
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
