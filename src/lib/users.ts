import { prisma } from "@/lib/db";
import { fetchPlayerGiglings } from "@/lib/gigaverse/api";
import type { User } from "@prisma/client";

/** Normalise wallet addresses to lowercase for stable uniqueness. */
export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

/** Find or create a user by wallet address. */
export async function getOrCreateUser(walletAddress: string): Promise<User> {
  const wallet = normalizeAddress(walletAddress);
  return prisma.user.upsert({
    where: { walletAddress: wallet },
    create: { walletAddress: wallet },
    update: {},
  });
}

/**
 * Pull a wallet's real racing stats from Gigaverse and store them. ELO is the
 * highest ELO across the wallet's giglings; race count sums each gigling's
 * wins + losses. Best-effort.
 */
export async function syncUserElo(
  userId: string,
  walletAddress: string
): Promise<{ elo: number | null; totalRaces: number }> {
  const giglings = await fetchPlayerGiglings(walletAddress);
  const elo = giglings.reduce<number | null>(
    (best, g) => (g.elo != null && (best === null || g.elo > best) ? g.elo : best),
    null
  );
  const totalRaces = giglings.reduce(
    (sum, g) => sum + ((g.wins ?? 0) + (g.losses ?? 0)),
    0
  );
  await prisma.user.update({
    where: { id: userId },
    data: { elo: elo ?? undefined, totalRaces: totalRaces || undefined },
  });
  return { elo, totalRaces };
}
