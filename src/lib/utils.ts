import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten a wallet address: 0x1234…abcd */
export function truncateAddress(address?: string | null, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format ms finish time as s.mmm (e.g. 12.480s) */
export function formatRaceTime(ms?: bigint | number | null): string {
  if (ms === null || ms === undefined) return "-";
  const n = typeof ms === "bigint" ? Number(ms) : ms;
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${(n / 1000).toFixed(3)}s`;
}

/** Display a possibly-null number with a fallback. */
export function formatNumber(n?: number | null, fallback = "-"): string {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return new Intl.NumberFormat("en-US").format(n);
}

/** Win rate as a rounded percentage string. */
export function winRate(wins: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

/** Best display label for a user-like object. */
export function displayName(
  user?: { username?: string | null; walletAddress?: string | null } | null,
  fallback = "TBD"
): string {
  if (!user) return fallback;
  if (user.username) return user.username;
  if (user.walletAddress) return truncateAddress(user.walletAddress, 3);
  return fallback;
}

/** Stable, URL-safe slug from a tournament name. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Convert any BigInt fields in an object tree to strings (for JSON responses). */
export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}
