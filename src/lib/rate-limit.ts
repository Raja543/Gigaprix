/**
 * Lightweight in-memory rate limiter (fixed window per key).
 *
 * Best-effort: state lives per server instance, so on serverless it resets on
 * cold starts and isn't shared across instances. It still blunts obvious spam
 * (rapid create/join floods). For hard guarantees, back this with Redis/DB.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000; // guard against unbounded growth

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds until the window resets
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    if (buckets.size > MAX_KEYS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count++;
  return { ok: true, retryAfter: 0 };
}
