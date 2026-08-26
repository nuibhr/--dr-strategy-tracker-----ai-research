# Thai Dividend Portfolio: broker connection setup

The `/thai-dividend-portfolio` page lets each authenticated customer save their own Settrade Open API application credentials. The `/dividend-dashboard` page is the customer overview; its portfolio figures are explicitly demo data until the read-only portfolio-sync step is implemented. The MVP verifies application authentication only. It does not fetch a customer portfolio, submit an order, or enable unattended trading.

## One-time server configuration

Configure a durable MySQL-compatible `DATABASE_URL` first. The app deliberately refuses customer credentials when a database is not configured, so an in-memory development fallback can never silently lose them.

Create a unique 32-byte encryption key once:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Place its output in the hosting provider's **server-side secret/environment variable** field:

| Source value | Deployment field |
|---|---|
| Generated 32-byte base64 key | `BROKER_CREDENTIALS_ENCRYPTION_KEY` |
| Production database connection | `DATABASE_URL` |
| Session signing key | `JWT_SECRET` |

Never put `BROKER_CREDENTIALS_ENCRYPTION_KEY`, a Settrade App Secret, or an API token in a `VITE_*` variable. `VITE_*` values are visible to browsers.

## Customer flow

1. Customer opens their supported broker's Streaming / Settrade API Portal and generates their own App ID and App Secret.
2. In **Dividend Portfolio**, customer enters:
   - **Broker ID**: the broker code supplied by their broker / Settrade portal.
   - **App code**: the application code supplied for that API application. The form starts with `ALGO_EQ`; change it only when the broker provides a different value.
   - **App ID** and **App Secret**: generated for the customer's own account.
3. The browser sends the values through HTTPS to the server. The server encrypts the App ID and App Secret with AES-256-GCM before writing the database row. The API only returns an App ID hint such as `abcd••••12`.
4. Customer clicks **ทดสอบการเชื่อมต่อ**. This uses the Settrade authentication endpoint only; it does not place, amend, cancel, or read any order.

## Before enabling execution

Do not activate an order endpoint until all of these are complete:

- Verify the exact account / order APIs and allowed parameters with the relevant broker.
- Implement read-only portfolio import, order preview, tick/lot validation, buying-power checks, max-order and daily-loss limits, idempotency keys, audit logs, and a kill switch.
- Use the Settrade sandbox with a dedicated test application first.
- Obtain compliance/legal sign-off for the intended customer flow, client agreement, suitability process, and permission model.
- Keep secrets in server memory only for the duration of an API call; never return them to the browser or write them to logs.

## Key rotation and incident response

If an App Secret or encryption key is exposed, revoke/rotate it immediately in the relevant portal. Rotating `BROKER_CREDENTIALS_ENCRYPTION_KEY` without first re-encrypting stored records makes existing customer credentials unreadable; plan a migration and force reconnection where necessary.
