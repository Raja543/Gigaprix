# GigaPrix

**The esports layer for [Gigling Racing](https://gigaverse.io/racing).** GigaPrix
turns isolated Gigaverse races (up to 8 pets each) into organized **championships
and leagues**: a host creates a competition, players join with their wallet, the
field auto-seeds into groups of 8, each group runs a real on-chain race, and the
results are read back from the **Abstract** chain (chainId 2741) to auto-advance
the stages until one champion remains.

It **orchestrates** races — it never creates them itself. Players race on
Gigaverse; GigaPrix links the on-chain race to a heat, verifies it, and advances
the bracket / standings.

---

## Features

- **Two formats** — **Knockout Championship** (staged groups → grand final) and
  **League** (round-robin matchdays, ranked by points). *Coming soon: Time Trial,
  Swiss, Guild Cup.*
- **Race types** — Dash (500m), Sprint (1200m), Marathon (2400m), Grand Prix (3000m).
- **Wallet auth (SIWE)** — connect an Abstract Global Wallet, then sign in once;
  the server verifies the signature (EOA + smart-account EIP-1271/6492) and never
  trusts a client-supplied address.
- **Host & co-host tools** — invite links, bulk-add wallets, whitelist, open/close
  registration, per-stage qualifier edits, **timezone-aware scheduling**, manual
  result overrides, reopen/simulate heats, test-mode auto-run, co-hosts.
- **Live everything** — link an on-chain race → spectate it embedded → fetch the
  result → qualifiers advance, with the bracket/standings updating in real time.
- **Profiles** — display name, Discord, Twitter, bio, owned giglings (rarity +
  ELO), competition history.
- **Host dashboard** with analytics (competitions, live, completed, total racers,
  champions crowned).
- **Private "Creator Cups"** — unlisted, invite-only competitions.

## The flow (how a competition runs)

1. **Create** a competition (format, race type, size, rules).
2. Players **connect + sign in**, then **join** with their wallet (they pick a
   gigling at race time).
3. The host **starts** it → the field auto-seeds into groups of 8.
4. For each group: **Create race on Gigaverse** (same wallet) → **Fetch race ID**
   (auto-detects it) or paste it → **Spectate** → **Fetch result**.
5. The top N **qualify** and advance automatically, stage by stage, to a final and
   a **champion**. Standings publish on completion (live for leagues).

## Roles

- **Host** — creates and runs a competition (full control).
- **Co-host** — a wallet the host grants manager rights to (everything except
  cancel / managing co-hosts).
- **Player** — joins with a wallet, races their gigling.
- **Spectator** — anyone; watches live and browses results.

## Stack

- **Next.js 16** (App Router, RSC) · React 19 · TypeScript
- **Tailwind v4** (CSS theme in `src/app/globals.css`)
- **Prisma 6** · **Supabase** PostgreSQL
- **viem** (Abstract reads + signature verification) · **wagmi** +
  **Abstract Global Wallet** · **pusher-js** (GigaSocket lobby)
- **TanStack Query** · **zod** · **Vitest**

---

## Getting started

```bash
npm install
```

**1. Configure `.env`** (single file at the repo root; `.env*` is gitignored):

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` / `DIRECT_URL` | ✅ | Supabase Postgres connection strings |
| `AUTH_SECRET` | ✅ | Signs wallet session cookies (long random string) |
| `CRON_SECRET` | ✅ in prod | Protects the race-sync cron |
| `NEXT_PUBLIC_ABSTRACT_RPC` | ✅ | `https://api.mainnet.abs.xyz` |
| `NEXT_PUBLIC_PET_RACING_ADDRESS` | ✅ | Gigaverse PetRacingSystem |
| `GIGAVERSE_API_BASE` | ✅ | `https://gigaverse.io/api/racing` |
| `NEXT_PUBLIC_PUSHER_KEY` / `_CLUSTER` | optional | Live lobby |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | Remote error reporting |
| `NEXT_PUBLIC_SITE_URL` | optional | Absolute URL for OG/social cards |
| `NEXT_PUBLIC_USE_MOCK_GIGAVERSE` | optional | `"true"` to run without the live API |

**2. Database:**

```bash
npm run db:push     # sync schema to the DB
# Demo data is optional and DESTRUCTIVE (wipes the DB), so it's guarded:
SEED_RESET=true npm run db:seed
```

**3. Run:**

```bash
npm run dev
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` / `test:watch` | Vitest (bracket/league/permissions logic) |
| `npm run db:push` / `db:migrate` | Apply schema |
| `npm run db:seed` | Seed demo data (needs `SEED_RESET=true` to wipe) |
| `npm run db:clear-demo` | Remove only the synthetic demo rows |
| `npm run db:studio` | Prisma Studio |

## Project structure

```
src/
  app/                 routes (landing, /tournaments, /dashboard, /profile, api/*)
    api/auth/          SIWE: nonce / verify / session / logout
    api/cron/          race-sync cron
  actions/             server actions (tournament, match, profile) — session-gated
  components/          UI (tournament/, profile/, shared/, ui/)
  hooks/               useWallet, useAuth, useTournament, useGiglings
  lib/
    auth/              wallet session (HMAC cookie) + sign-in message
    tournament/        seeding, advancement, standings (Knockout + League)
    race/              on-chain race linking + result processing
    gigaverse/         contract reads (viem) + REST API client
    permissions.ts     host / co-host checks
    rate-limit.ts      in-memory limiter
prisma/                schema, seed, clear-demo
```

## Security

Wallet auth is **signature-based (SIWE)** — every server action derives the
caller from a verified session cookie, not from client arguments. Plus rate
limiting, cron hardening, and HTTP security headers. See **[SECURITY.md](SECURITY.md)**.

## Deploy

Push to GitHub and import the repo in Vercel; set the env vars and the cron in
`vercel.json` runs automatically. Full checklist in **[DEPLOY.md](DEPLOY.md)**.

## Roadmap

- Formats: **Time Trial**, **Swiss**, **Guild Cup** (team scoring) — arrive with
  unlimited racing.
- Prizes / payouts, notifications, deeper analytics, and a full a11y pass.

> Note on on-chain reads: the live `getRace` struct differs from the reference
> ABI, so status is read via `getRacePhase` and results via the typed array
> reads (`getRaceFinalRanking`, `getRaceFinishTimes`, `getPetOwnerInRace`,
> `getRacePets`) — all verified against mainnet.
