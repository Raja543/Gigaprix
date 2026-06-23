"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateUser, normalizeAddress, syncUserElo } from "@/lib/users";
import { getSessionWallet } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validation";
import type { ActionResult } from "./tournament";

export async function updateProfileAction(
  input: unknown
): Promise<ActionResult> {
  // You can only edit your own profile (the authenticated wallet).
  const caller = await getSessionWallet();
  if (!caller) {
    return { ok: false, error: "Sign in with your wallet to continue." };
  }
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { username, avatar, discord, twitter, bio } = parsed.data;
  const user = await getOrCreateUser(caller);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      username: username ?? undefined,
      avatar: avatar ?? undefined,
      discord: discord ?? null,
      twitter: twitter ?? null,
      bio: bio ?? null,
    },
  });

  revalidatePath(`/profile/${caller}`);
  return { ok: true, data: null };
}

/** Refresh your own real ELO + race count from Gigaverse. */
export async function syncEloAction(): Promise<
  ActionResult<{ elo: number | null; totalRaces: number }>
> {
  const caller = await getSessionWallet();
  if (!caller) {
    return { ok: false, error: "Sign in with your wallet to continue." };
  }
  try {
    const user = await getOrCreateUser(caller);
    const result = await syncUserElo(user.id, caller);
    revalidatePath(`/profile/${normalizeAddress(caller)}`);
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}
