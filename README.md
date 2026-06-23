# GigaPrix

An esports infrastructure layer for **Gigling Racing** — tournaments, leagues, and
championships built directly on Gigaverse contracts, events, APIs, and realtime
systems on **Abstract** (chainId 2741).

The platform **orchestrates** rather than creates races: participants run normal
Gigaverse races, then submit the `raceId` to a tournament match. We validate it
on-chain, watch for `RaceResolved`, and auto-advance the bracket / standings.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind v4** (CSS-based theme in `src/app/globals.css`)
- **Prisma 6** · PostgreSQL (Neon for serverless)
- **viem** (Abstract reads) · **wagmi** (wallet) · **pusher-js** (GigaSocket)
- **TanStack Query** · **zod**

## Getting started

1. **Install** (already done if `node_modules` exists):

   ```bash
   npm install
   ```

2. **Configure env** — all settings live in a single `.env` at the repo root.

   At minimum set `DATABASE_URL` (+ `DIRECT_URL`). To run the UI without live
   Gigaverse access, set `NEXT_PUBLIC_USE_MOCK_GIGAVERSE="true"`. Set
   `NEXT_PUBLIC_SENTRY_DSN` to enable error monitoring, and `CRON_SECRET` to
   protect the race-sync cron.

3. **Database**:

   ```bash
   npm run db:push     # create tables from schema
   npm run db:seed     # demo users + tournaments (incl. a live bracket)
   ```

4. **Run**:

   ```bash
   npm run dev
   ```

## Wiring in the real Gigaverse contract

`src/lib/gigaverse/contracts.ts` ships a **placeholder ABI** matching the read
functions in the implementation plan. Replace `PET_RACING_ABI` with the official
PetRacingSystem ABI; keep the exported helper names (`getRace`, `getRacePhase`,
`getRacePets`, `getRaceFinalRanking`, `getRaceFinishTimes`, `getPetOwnerInRace`)
stable so nothing else changes. Verify the event signatures in
`src/lib/gigaverse/events.ts` too.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` / `db:migrate` | Apply schema |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |

## How it works

- **Tournament engine** (`src/lib/tournament/`) — single-elimination bracket
  generation (standard seeding + byes), round-robin scheduling (circle method),
  standings (3/1/0 with head-to-head + best-time tiebreaks), and advancement.
- **Race linking** (`src/lib/race/`) — validates a submitted `raceId` on-chain,
  links it to a match, and processes the result when the race resolves.
- **Sync** — `src/app/api/cron/sync-races` (Vercel Cron, every minute, see
  `vercel.json`) polls linked races and reconciles match state. A
  `race-resolved` webhook is also available for event-listener pushes.

## Deploy (Vercel)

Set the env vars in the Vercel dashboard, point `DATABASE_URL` at Neon (pooled),
and the cron in `vercel.json` runs automatically. `CRON_SECRET` guards the cron
and webhook endpoints.
