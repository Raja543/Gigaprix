# Deploy & Launch Checklist

## 1. Environment variables (production)
Set these in your host (e.g. Vercel → Project → Settings → Environment Variables):

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | ✅ | Supabase pooled connection string |
| `DIRECT_URL` | ✅ | Direct connection (Prisma migrations/push) |
| `NEXT_PUBLIC_ABSTRACT_RPC` | ✅ | `https://api.mainnet.abs.xyz` |
| `NEXT_PUBLIC_PET_RACING_ADDRESS` | ✅ | Gigaverse PetRacingSystem address |
| `GIGAVERSE_API_BASE` | ✅ | `https://gigaverse.io/api/racing` |
| `AUTH_SECRET` | ✅ | Long random string. Signs wallet session cookies — **required in prod**. Rotating it logs everyone out. |
| `CRON_SECRET` | ✅ | Long random string. **Required in prod** — the cron refuses to run unprotected. |
| `NEXT_PUBLIC_PUSHER_KEY` / `_CLUSTER` | optional | Live lobby updates |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | optional | WalletConnect |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | Enables remote error reporting |
| `NEXT_PUBLIC_USE_MOCK_GIGAVERSE` | optional | `"true"` only for demos without the live API |

## 2. Database
```bash
npm run db:push        # sync schema to the prod DB (first deploy)
# Do NOT run db:seed in prod — it loads demo data (guarded behind SEED_RESET).
```
- Confirm **Supabase backups / Point-in-Time Recovery** are enabled. (A bad reset
  is otherwise unrecoverable.)

## 3. Build
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## 4. Cron (auto-resolve linked races)
- `vercel.json` registers `/api/cron/sync-races` every minute.
- Vercel automatically sends `Authorization: Bearer $CRON_SECRET`, so just set
  `CRON_SECRET` and the cron is protected.
- Verify after deploy: link a race, let it resolve on-chain, and confirm the heat
  advances within ~1 min without anyone clicking "Fetch result".

## 5. Wallet (Abstract Global Wallet)
- Confirm wallet connect works on the **production domain** (AGW origin config).
  Local success does not guarantee prod.

## 6. Pre-launch smoke test (do this yourself before inviting players)
1. Create a competition (Knockout) with a few wallets (or Test mode).
2. Start it → stages generate.
3. Create the race on Gigaverse with the **same wallet**, then "Fetch race ID".
4. Let it resolve → confirm qualifiers advance and standings update.
5. Confirm the finished competition shows under **Recently Finished / Recent
   Champions** on the landing and in the browser.

## Notes (see SECURITY.md)
- Wallet auth is **signature-based** (SIWE): users connect, then **Sign in** once
  to prove wallet ownership before they can host/manage/join. Server actions
  enforce this — client-supplied addresses are never trusted.
- Rate limiting is in-memory (best-effort on serverless).
