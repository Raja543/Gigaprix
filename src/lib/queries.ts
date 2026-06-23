import "server-only";
import { prisma } from "@/lib/db";
import { serializeTournamentFull } from "@/lib/serialize";
import type { UITournamentFull } from "@/types/ui";

export async function getTournamentFull(
  id: string
): Promise<UITournamentFull | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      host: true,
      participants: { include: { user: true }, orderBy: { seed: "asc" } },
      matches: {
        include: {
          winner: true,
          entries: { include: { user: true }, orderBy: { finishPosition: "asc" } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
      standings: { include: { user: true }, orderBy: { rank: "asc" } },
    },
  });
  if (!tournament) return null;
  return serializeTournamentFull(tournament);
}
