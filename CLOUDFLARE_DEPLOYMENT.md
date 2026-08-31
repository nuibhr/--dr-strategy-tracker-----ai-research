# Cloudflare Container deployment

This project keeps the existing Node/Express API and Dockerfile, and routes it
through a Cloudflare Container Worker. The production database remains the
existing TiDB Cloud `dr_tracker` database; no application data is stored in the
container filesystem.

## Prerequisites

- Cloudflare Workers Paid plan (Containers are not available on Workers Free).
- Docker Desktop running locally, or configure the repository with Workers Builds.
- Wrangler authenticated with the intended Cloudflare account:

```powershell
npx wrangler login
npx wrangler whoami
```

## Deploy

Run from this project directory:

```powershell
npx wrangler deploy
```

The first deployment builds the root `Dockerfile` and may take several minutes
while Cloudflare provisions the container. The resulting `workers.dev` URL is
the temporary API URL for validation.

## Secrets and variables

Set each server-side secret with Wrangler. Do not put these values in the
repository or any `VITE_` variable:

```powershell
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put BROKER_CREDENTIALS_ENCRYPTION_KEY
npx wrangler secret put BROKER_APP_ID
npx wrangler secret put BROKER_API_SECRET
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put DR_TRACKER_SERVICE_TOKEN
```

Non-secret configuration can be added in the Cloudflare dashboard or with
`wrangler.toml` vars. At minimum set `FRONTEND_ORIGIN` to the exact Cloudflare
Pages URL and retain the Settrade/DR configuration currently used by Fly.

## Cutover checklist

1. Check `GET /api/health` on the new `workers.dev` URL.
2. Test login, tRPC reads/writes and a database persistence check.
3. Test the real Settrade price endpoint and DR80 scan (no mock fallback).
4. Test Telegram webhook/send with the production bot.
5. Change the Pages `VITE_API_BASE_URL` to the new API URL and redeploy Pages.
6. Keep Fly running until the above checks pass; then stop/scale it down and
   verify the Fly invoice before removing anything.
