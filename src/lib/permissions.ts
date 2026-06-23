/**
 * Shared host/co-host permission checks (pure; usable on client and server).
 *
 * - Primary host: the wallet that created the competition.
 * - Co-host: a wallet the host granted manager rights to.
 * - Manager: host OR co-host. Managers can run the competition; only the
 *   primary host can cancel it or change the co-host list.
 */

interface ManagedTournament {
  host?: { walletAddress: string } | null;
  coHosts?: string[] | null;
}

function lc(s?: string | null): string {
  return (s ?? "").toLowerCase();
}

export function isPrimaryHost(
  t: ManagedTournament,
  wallet?: string | null
): boolean {
  if (!wallet) return false;
  return lc(wallet) === lc(t.host?.walletAddress);
}

export function isManager(
  t: ManagedTournament,
  wallet?: string | null
): boolean {
  if (!wallet) return false;
  const w = lc(wallet);
  if (w === lc(t.host?.walletAddress)) return true;
  return (t.coHosts ?? []).some((c) => lc(c) === w);
}
