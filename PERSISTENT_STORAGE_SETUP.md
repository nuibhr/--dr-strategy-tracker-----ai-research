# Persistent storage and per-user access

## What is now implemented

- Admin Users has an `เปิดสิทธิ์ดู` / `ปิดสิทธิ์ดู` switch for each account.
- Disabled viewer accounts cannot log in and cannot call the protected DR/data APIs.
- Admin accounts remain available so an admin can restore a viewer.
- `users.accessEnabled` is migrated with the generated Drizzle migration in `drizzle/`.

## One-time Fly setup

1. Create a MySQL-compatible TiDB Cloud Serverless cluster.
2. Copy its MySQL connection string. Keep it private.
3. In Fly.io, open the backend app `dr-strategy-tracker-api-nuideeppeak` → Secrets and add:

   `DATABASE_URL=<the copied MySQL connection string>`

   Keep this on the backend only. Do not add it to Cloudflare Pages and do not prefix it with `VITE_`.

4. From this project, with `DATABASE_URL` set in the shell, run:

   `npm run db:push`

   In PowerShell, set it for that one command session with:

   `$env:DATABASE_URL = "<the copied MySQL connection string>"`

   This creates the tables and applies the access flag migration.

5. Redeploy/restart the Fly backend. After that, users, passwords, access switches, DR picks, and broker connection records are stored in MySQL instead of the temporary in-memory fallback.

If `DATABASE_URL` is missing, the app deliberately falls back to memory for local development; those values disappear whenever the process restarts.
