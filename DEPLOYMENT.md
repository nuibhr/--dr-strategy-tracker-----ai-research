# Deployment Guide

This project should be deployed as two services:

1. Frontend: Cloudflare Pages
2. Backend/API: Node.js host such as Railway, Render, Fly.io, or a VPS

The app is not static-only. It uses Express, tRPC, Settrade API credentials, Telegram, auth cookies, scheduled endpoints, and MySQL. Keep the backend on a Node.js host unless the server is later refactored to Cloudflare Workers/Pages Functions.

## 1. Prepare Secrets

Rotate production secrets before deployment if any value was ever shared in chat or committed locally.

Required backend environment variables:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=replace-with-a-long-random-string
FRONTEND_ORIGIN=https://your-frontend-domain.example
OAUTH_SERVER_URL=https://your-backend-domain.example
OWNER_OPEN_ID=
DATABASE_URL=mysql://user:password@host:3306/database
SETTRADE_BROKER_ID=022
SETTRADE_APP_ID=
SETTRADE_APP_SECRET=
SETTRADE_REQUIRE_REALTIME=true
DR_ALLOWED_SUFFIXES=80
DR_INCLUDE_GENERATED_VARIANTS=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Required Cloudflare Pages environment variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.example
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
```

## 2. Create Production Database

Use a MySQL-compatible database.

Then run migrations from your machine or from the backend host:

```bash
npm run db:push
```

Do not rely on the local in-memory fallback in production. It is only for local development and resets when the server restarts.

## 3. Deploy Backend/API

Recommended command settings for a Node.js host:

```txt
Build command: npm install && npm run build
Start command: npm run start
```

The server serves API routes under:

```txt
/api/trpc
/api/oauth/callback
/api/telegram/webhook
/api/scheduled/dr80-scan
```

After deployment, verify:

```txt
https://your-backend-domain.example/api/health
```

## 4. Deploy Frontend to Cloudflare Pages

In Cloudflare Dashboard:

1. Go to Workers & Pages.
2. Create application.
3. Choose Pages.
4. Connect the GitHub repository.
5. Set build settings:

```txt
Framework preset: Vite
Build command: npm run build:client
Build output directory: dist/public
```

6. Add Cloudflare Pages environment variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.example
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
```

7. Deploy.

## 5. Connect Domains

Recommended DNS:

```txt
dr.example.com      -> Cloudflare Pages frontend
api-dr.example.com  -> backend/API host
```

Set backend `FRONTEND_ORIGIN` to the exact frontend URL:

```env
FRONTEND_ORIGIN=https://dr.example.com
```

Set frontend `VITE_API_BASE_URL` to the exact backend URL:

```env
VITE_API_BASE_URL=https://api-dr.example.com
```

## 6. Telegram Webhook

Once the backend domain is live, open:

```txt
https://your-backend-domain.example/api/telegram/webhook/set
```

This registers the Telegram webhook for:

```txt
https://your-backend-domain.example/api/telegram/webhook
```

## 7. Admin Setup

First admin options:

1. Set `OWNER_OPEN_ID` before the owner logs in.
2. Or log in once, then update the user role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

After the first admin exists, use:

```txt
/admin/users
```

to promote or demote users.

## 8. Production Checklist

- [ ] New Settrade production credentials are configured.
- [ ] Telegram token was rotated and configured.
- [ ] `DATABASE_URL` points to production MySQL.
- [ ] `FRONTEND_ORIGIN` exactly matches the Cloudflare Pages domain.
- [ ] `VITE_API_BASE_URL` exactly matches the backend domain.
- [ ] `JWT_SECRET` is long and unique.
- [ ] `OWNER_OPEN_ID` is set or an admin user exists.
- [ ] Cloudflare Pages build uses `npm run build:client`.
- [ ] Backend build uses `npm run build`.
- [ ] `/dr80-scanner` shows `Settrade: live`.
- [ ] Telegram send button succeeds.
- [ ] Add to DR Picks persists after backend restart.
