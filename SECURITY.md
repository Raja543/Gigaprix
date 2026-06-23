# Security Review

Last reviewed against the current codebase. Findings ordered by severity.

## ✅ Clean
- **Secrets**: `.env*` is gitignored and untracked; no server secrets are exposed
  behind `NEXT_PUBLIC_`. Only public config (RPC, addresses, Pusher key) ships to
  the client.
- **Injection**: all DB access goes through Prisma (parameterized). No raw SQL.
- **XSS**: no `dangerouslySetInnerHTML` / `eval`. React escapes output. Embedded
  race IDs are numeric; the spectator iframe points only at `gigaverse.io`.
- **Input validation**: create/join/profile inputs are validated with zod;
  race/pet IDs parsed via a strict numeric `toBigInt`.

## ✅ FIXED — wallet auth is now signature-based (SIWE sessions)
Previously server actions trusted the client-supplied `walletAddress`. Now:

- The client requests a **nonce** (`/api/auth/nonce`), signs a SIWE-style message
  with their wallet, and the server **verifies the signature** (`/api/auth/verify`)
  using viem `verifyMessage` — which covers EOAs and **Abstract smart accounts**
  (EIP-1271 / EIP-6492). On success it sets an **HMAC-signed, HTTP-only session
  cookie**.
- **Every** server action and the create/join API derive the caller from
  `getSessionWallet()` (the verified session) and **ignore client-supplied
  addresses**. No session → action refuses with "Sign in to continue."
- Requires `AUTH_SECRET` (signs session cookies). Set a long random value in prod.

Impersonation is no longer possible without controlling the wallet's signature.

## ✅ FIXED — host listing no longer leaks private/draft competitions
`GET /api/tournaments?host=<addr>` now returns drafts/private competitions only
when the **session wallet matches** the requested host (or co-hosts); everyone
else sees only that host's public, non-draft competitions.

## ✅ Fixed in this pass
- **Cron hardening**: `/api/cron/sync-races` now **refuses to run in production
  without `CRON_SECRET`** (was open if the secret was unset), and still requires
  a matching `Bearer` token when set.
- **Rate limiting**: in-memory fixed-window limiter on the spam-prone public
  paths — competition creation (5 / 10 min per wallet) and joins (30 / min per
  wallet), on both the server actions and the REST routes. Best-effort on
  serverless (per-instance); move to Redis/DB for hard guarantees.

## ✅ Added — HTTP security headers
`next.config.ts` now sends `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, and a **report-only** CSP (kept
report-only so it can't break the wallet popup / RPC / embedded race iframe;
flip to enforcing once validated against real traffic).

## ⚠️ Dependency advisories (npm audit)
All current advisories are **transitive**, not in our own code, and can't be
fixed without upstream bumps (a `--force` upgrade breaks the wagmi/viem/AGW and
vitest stacks):
- **Dev/build-time only:** `esbuild` / `vite` / `vite-node` / `vitest` (the
  esbuild advisory is about the *dev server*) and `postcss` (under `next`).
- **Wallet connector tree:** `elliptic` / `secp256k1` / `uuid` pulled deep under
  `@metamask/*` connectors. Risk is gated by those libraries; track wagmi/AGW
  releases and re-audit periodically.

None are directly exploitable in the app's own server code. Re-run `npm audit`
after dependency upgrades before launch.

## Recommended before open launch
1. Set a strong **`AUTH_SECRET`** in production (and rotate if leaked — rotating
   invalidates all sessions).
2. Move rate limiting to a shared store (Redis/Upstash) if abuse is expected.
3. Set `NEXT_PUBLIC_SENTRY_DSN` so errors are actually captured.
4. Enable Supabase backups / PITR.
