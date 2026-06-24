import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { serializeTournamentCards } from "@/lib/serialize";
import { TournamentCard } from "@/components/tournament/TournamentCard";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { Prisma, TournamentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  search?: string;
  sort?: string;
  page?: string;
}>;

const PAGE_SIZE = 12;

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));

  const where: Prisma.TournamentWhereInput = {
    isPublic: true,
    status: { not: "DRAFT" },
  };
  if (sp.status) where.status = sp.status as TournamentStatus;
  if (sp.search) where.name = { contains: sp.search, mode: "insensitive" };

  const orderBy: Prisma.TournamentOrderByWithRelationInput =
    sp.sort === "participants"
      ? { participants: { _count: "desc" } }
      : { createdAt: "desc" };

  // Degrade to an empty list rather than a crash if the DB is unreachable.
  const result = await Promise.all([
    prisma.tournament.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        host: true,
        _count: { select: { participants: true, matches: true } },
      },
    }),
    prisma.tournament.count({ where }),
  ]).catch(() => null);

  const total = result?.[1] ?? 0;
  const tournaments = serializeTournamentCards(result?.[0] ?? []);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (sp.status) params.set("status", sp.status);
    if (sp.search) params.set("search", sp.search);
    if (sp.sort) params.set("sort", sp.sort);
    params.set("page", String(p));
    return `/tournaments?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Championships</h1>
          <p className="mt-1 text-text-muted">
            {total} {total === 1 ? "championship" : "championships"} · find your
            next competition
          </p>
        </div>
        <Link href="/tournaments/create">
          <Button>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      {/* Filters (GET form - no client JS needed) */}
      <form className="mb-8 grid gap-3 sm:grid-cols-3" method="get">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
          <Input
            name="search"
            defaultValue={sp.search}
            placeholder="Search championships…"
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={sp.status ?? ""}>
          <option value="">All statuses</option>
          <option value="REGISTRATION">Registration</option>
          <option value="IN_PROGRESS">Live</option>
          <option value="COMPLETED">Completed</option>
        </Select>
        <div className="flex gap-2 sm:col-span-3">
          <Select name="sort" defaultValue={sp.sort ?? "newest"} className="w-48">
            <option value="newest">Newest first</option>
            <option value="participants">Most participants</option>
          </Select>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </div>
      </form>

      {tournaments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-text-muted">
          No championships match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={pageHref(page - 1)}>
              <Button variant="outline" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <span className="px-3 text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)}>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
