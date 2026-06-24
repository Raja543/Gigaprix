import Link from "next/link";
import { Trophy, Zap, Users, Flag, ArrowRight, Radio } from "lucide-react";
import { prisma } from "@/lib/db";
import { fetchGlobalStats } from "@/lib/gigaverse/api";
import { serializeTournamentCards } from "@/lib/serialize";
import { captureError } from "@/lib/monitoring";
import { formatLabel } from "@/lib/competition";
import { TournamentCard } from "@/components/tournament/TournamentCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LiveIndicator } from "@/components/shared/LiveIndicator";
import { cn, displayName, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getLandingData() {
  const cardInclude = {
    host: true,
    _count: { select: { participants: true, matches: true } },
  } as const;

  // Never let the homepage crash on a transient DB/API issue - degrade to empty.
  try {
    const [live, openReg, completed, champions, stats] = await Promise.all([
      prisma.tournament.findMany({
        where: { status: "IN_PROGRESS", isPublic: true },
        include: cardInclude,
        orderBy: { startedAt: "desc" },
        take: 6,
      }),
      prisma.tournament.findMany({
        where: { status: "REGISTRATION", isPublic: true },
        include: cardInclude,
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.tournament.findMany({
        where: { status: "COMPLETED", isPublic: true },
        include: cardInclude,
        orderBy: { completedAt: "desc" },
        take: 6,
      }),
      prisma.tournament.findMany({
        where: { status: "COMPLETED", championId: { not: null } },
        include: { host: true },
        orderBy: { completedAt: "desc" },
        take: 4,
      }),
      fetchGlobalStats().catch(() => null),
    ]);

    const championUsers = await prisma.user.findMany({
      where: { id: { in: champions.map((c) => c.championId!).filter(Boolean) } },
    });
    const userById = new Map(championUsers.map((u) => [u.id, u]));

    return {
      live: serializeTournamentCards(live),
      openReg: serializeTournamentCards(openReg),
      completed: serializeTournamentCards(completed),
      champions: champions.map((c) => ({
        id: c.id,
        name: c.name,
        champion: c.championId ? userById.get(c.championId) ?? null : null,
      })),
      stats,
    };
  } catch (err) {
    captureError(err, { page: "landing", reason: "getLandingData failed" });
    return {
      live: [],
      openReg: [],
      completed: [],
      champions: [] as { id: string; name: string; champion: null }[],
      stats: null,
    };
  }
}

export default async function HomePage() {
  const { live, openReg, completed, champions, stats } = await getLandingData();
  const featured = live[0] ?? openReg[0] ?? null;
  const ticker = [...live, ...openReg];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="relative py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Built on Gigaverse · Abstract 2741
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
            The esports layer for
            <br />
            <span className="neon-text">Gigling Racing</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-text-muted">
            Turn isolated races into multi-stage championships. Link on-chain
            races, auto-advance the stages, and crown a champion - no
            spreadsheets required.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/tournaments/create">
              <Button size="lg">
                Create Championship <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button size="lg" variant="outline">
                Browse Championships
              </Button>
            </Link>
          </div>
        </div>

        {/* Live "grand prix" ticker */}
        {ticker.length > 0 && (
          <div className="relative mt-14 overflow-hidden border-y border-border/60 py-2.5">
            <div className="marquee-track gap-8">
              {[...ticker, ...ticker].map((t, i) => (
                <span
                  key={i}
                  className="mx-5 inline-flex items-center gap-2 text-sm"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      t.status === "IN_PROGRESS" ? "bg-primary" : "bg-accent"
                    )}
                  />
                  <span className="font-medium text-text">{t.name}</span>
                  <span className="stat-number text-xs text-text-dim">
                    {t._count.participants}/{t.maxParticipants}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Global stats */}
      {stats && (
        <section className="grid grid-cols-2 gap-4 pb-12 sm:grid-cols-4">
          <StatCard icon={<Flag className="h-5 w-5 text-primary" />} label="Total Races" value={formatNumber(stats.totalRaces)} />
          <StatCard icon={<Zap className="h-5 w-5 text-accent" />} label="Race Entries" value={formatNumber(stats.totalEntries)} />
          <StatCard icon={<Users className="h-5 w-5 text-warning" />} label="Unique Racers" value={formatNumber(stats.uniquePlayers)} />
          <StatCard icon={<Radio className="h-5 w-5 text-danger" />} label="Resolved" value={formatNumber(stats.resolvedRaces)} />
        </section>
      )}

      {/* How it works */}
      <section className="pb-14">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-text-muted">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StepCard
            step={1}
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Create & fill"
            body="Spin up a Championship, Creator or Community Cup. Players join with just a wallet; the field auto-seeds into groups of 8."
          />
          <StepCard
            step={2}
            icon={<Flag className="h-5 w-5 text-accent" />}
            title="Race the stages"
            body="Each group runs a real Gigaverse race. Link it, spectate live, and the top qualifiers advance to the next stage automatically."
          />
          <StepCard
            step={3}
            icon={<Trophy className="h-5 w-5 text-gold" />}
            title="Crown a champion"
            body="Stages narrow the field down to one grand final. Standings publish the full finishing order when it's done."
          />
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="pb-12">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-muted">
            Featured Championship
          </h2>
          <Card className="gradient-border overflow-hidden p-0">
            <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {featured.status === "IN_PROGRESS" && <LiveIndicator />}
                <h3 className="mt-2 text-2xl font-bold">{featured.name}</h3>
                <p className="mt-1 max-w-lg text-text-muted">
                  {featured.description ?? "Join the competition."}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {featured._count.participants}/{featured.maxParticipants}
                  </span>
                  <span>{formatLabel(featured.format)}</span>
                </div>
              </div>
              <Link href={`/tournaments/${featured.id}`}>
                <Button size="lg">
                  View <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      )}

      {/* Live now */}
      {live.length > 0 && (
        <section className="pb-12">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">
              Live Now
            </h2>
            <LiveIndicator label={`${live.length} running`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {/* Open registration */}
      {openReg.length > 0 && (
        <section className="pb-12">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-muted">
            Open for Registration
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openReg.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {/* Recently finished */}
      {completed.length > 0 && (
        <section className="pb-12">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-text-muted">
            Recently Finished
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        </section>
      )}

      {/* Recent champions */}
      {champions.length > 0 && (
        <section id="leaderboard" className="pb-16">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text-muted">
            <Trophy className="h-4 w-4 text-gold" /> Recent Champions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {champions.map((c) => (
              <Link key={c.id} href={`/tournaments/${c.id}`}>
                <Card className="glass-hover flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-gold" />
                  <div className="min-w-0">
                    <div className="truncate font-bold text-gold">
                      {displayName(c.champion)}
                    </div>
                    <div className="truncate text-xs text-text-muted">
                      {c.name}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {live.length === 0 && openReg.length === 0 && completed.length === 0 && (
        <section className="pb-16">
          <Card className="flex flex-col items-center gap-4 py-16 text-center">
            <Trophy className="h-12 w-12 text-text-dim" />
            <h3 className="text-xl font-bold">No championships yet</h3>
            <p className="max-w-sm text-text-muted">
              Be the first to launch a Gigling Racing championship.
            </p>
            <Link href="/tournaments/create">
              <Button>Create the first one</Button>
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex flex-col gap-2">
      {icon}
      <div className="stat-number text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-text-muted">
        {label}
      </div>
    </Card>
  );
}

function StepCard({
  step,
  icon,
  title,
  body,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="relative flex flex-col gap-2">
      <span className="stat-number absolute right-4 top-4 text-3xl font-bold text-text-dim/40">
        {step}
      </span>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-2">
        {icon}
      </div>
      <div className="mt-1 font-bold">{title}</div>
      <p className="text-sm text-text-muted">{body}</p>
    </Card>
  );
}
