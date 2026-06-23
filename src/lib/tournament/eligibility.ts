import { prisma } from "@/lib/db";
import { normalizeAddress } from "@/lib/users";
import type { Tournament } from "@prisma/client";

export interface EligibilityResult {
  ok: boolean;
  error?: string;
}

/**
 * Enforce a competition's entry rules. Entry is open to any wallet (no gigling
 * required to register - players pick their gigling at race time); the only
 * gate is an optional host whitelist.
 */
export async function checkEligibility(
  tournament: Pick<Tournament, "id" | "whitelistEnabled">,
  walletAddress: string
): Promise<EligibilityResult> {
  const wallet = normalizeAddress(walletAddress);

  if (tournament.whitelistEnabled) {
    const wl = await prisma.whitelistEntry.findUnique({
      where: {
        tournamentId_walletAddress: {
          tournamentId: tournament.id,
          walletAddress: wallet,
        },
      },
    });
    if (!wl) {
      return {
        ok: false,
        error: "This competition is whitelist-only - your wallet isn't on the list.",
      };
    }
  }

  return { ok: true };
}
