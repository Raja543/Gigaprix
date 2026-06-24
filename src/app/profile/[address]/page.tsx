import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MessageCircle, AtSign } from "lucide-react";
import { prisma } from "@/lib/db";
import { fetchPlayerGiglings } from "@/lib/gigaverse/api";
import { captureError } from "@/lib/monitoring";
import { normalizeAddress } from "@/lib/users";
import { PlayerStats } from "@/components/profile/PlayerStats";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import {
  TournamentHistory,
  type HistoryEntry,
} from "@/components/profile/TournamentHistory";
import { GiglingCard } from "@/components/shared/GiglingCard";
import { serializeTournamentCard } from "@/lib/serialize";
import { displayName, truncateAddress } from "@/lib/utils";
import type { UIGigling } from "@/types/ui";

export const dynamic = "force-dynamic";

type Params = Promise<{ address: string }>;

export default async function ProfilePage({ params }: { params: Params }) {
  const { address } = await params;
  const wallet = normalizeAddress(decodeURIComponent(address));
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) notFound();

  // Degrade gracefully if the DB is unreachable rather than crashing the page.
  const user = await prisma.user
    .findUnique({
      where: { walletAddress: wallet },
      include: {
        participations: {
          include: { tournament: { include: { host: true } } },
          orderBy: { registeredAt: "desc" },
        },
        matchesWon: { select: { id: true } },
      },
    })
    .catch((err) => {
      captureError(err, { page: "profile", wallet });
      return null;
    });

  const rawGiglings = await fetchPlayerGiglings(wallet).catch(() => []);
  const giglings: UIGigling[] = rawGiglings.map((g) => ({
    ...g,
    petId: g.petId.toString(),
  }));
  const bestElo = giglings.reduce<number | null>(
    (best, g) => (g.elo != null && (best === null || g.elo > best) ? g.elo : best),
    null
  );
  const realRaces = giglings.reduce(
    (sum, g) => sum + ((g.wins ?? 0) + (g.losses ?? 0)),
    0
  );

  const tournaments = user?.participations ?? [];
  const championships = tournaments.filter(
    (p) => p.tournament.championId === user?.id
  ).length;

  const history: HistoryEntry[] = tournaments.map((p) => ({
    tournament: serializeTournamentCard(p.tournament),
    isChampion: p.tournament.championId === user?.id,
    placement: p.isEliminated ? "Eliminated" : undefined,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-bg">
            {(user?.username ?? wallet).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {displayName(user ?? { walletAddress: wallet })}
            </h1>
            <a
              href={`https://abscan.org/address/${wallet}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-sm text-text-muted hover:text-accent"
            >
              {truncateAddress(wallet, 6)} <ExternalLink className="h-3 w-3" />
            </a>
            {(user?.discord || user?.twitter) && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {user?.discord && (
                  <span className="inline-flex items-center gap-1.5 text-text-muted">
                    <MessageCircle className="h-4 w-4 text-accent" /> {user.discord}
                  </span>
                )}
                {user?.twitter && (
                  <a
                    href={`https://x.com/${user.twitter.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent"
                  >
                    <AtSign className="h-4 w-4" /> {user.twitter}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <ProfileEditor
          profile={{
            walletAddress: wallet,
            username: user?.username ?? null,
            discord: user?.discord ?? null,
            twitter: user?.twitter ?? null,
            bio: user?.bio ?? null,
          }}
        />
      </div>

      {user?.bio && (
        <p className="mb-6 max-w-2xl text-sm text-text-muted">{user.bio}</p>
      )}

      <PlayerStats
        totalRaces={realRaces || user?.totalRaces || 0}
        elo={bestElo ?? user?.elo ?? null}
        tournaments={tournaments.length}
        championships={championships}
        wins={user?.matchesWon.length ?? 0}
      />

      {/* Giglings */}
      {giglings.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-muted">
            Giglings ({giglings.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {giglings.slice(0, 9).map((g) => (
              <GiglingCard key={g.petId} gigling={g} />
            ))}
          </div>
        </section>
      )}

      {/* Competition history */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-muted">
          Competition History
        </h2>
        <TournamentHistory entries={history} />
      </section>

      {!user && (
        <p className="mt-8 text-center text-sm text-text-dim">
          This wallet hasn&apos;t joined any competitions yet.{" "}
          <Link href="/tournaments" className="text-primary hover:underline">
            Browse competitions
          </Link>
        </p>
      )}
    </div>
  );
}
