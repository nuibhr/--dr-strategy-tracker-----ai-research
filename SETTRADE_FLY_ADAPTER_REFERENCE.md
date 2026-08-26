# Settrade adapter reference for the Manus deployment

This document mirrors the server-only market-data path used by the Fly deployment. It intentionally contains no credentials, tokens, account numbers, or live secrets.

## Scope

- Login to Settrade Open API.
- Fetch one quote per DR symbol.
- Fetch daily candlesticks for technical indicators.
- No order, portfolio, account, execution, or background-worker behavior.

## Server environment variables

Use these in the backend runtime only. Do not prefix them with `VITE_`.

```env
SETTRADE_BROKER_ID=022
SETTRADE_APP_CODE=ALGO_EQ
BROKER_APP_ID=<Settrade App Id>
BROKER_API_SECRET=<Settrade App Secret, base64 raw P-256 private key>
SETTRADE_REQUIRE_REALTIME=true
```

The adapter also accepts the legacy aliases `SETTRADE_APP_ID` and `SETTRADE_APP_SECRET` for older Manus deployments, but `BROKER_APP_ID` and `BROKER_API_SECRET` are canonical.

## 1. Login

```http
POST https://open-api.settrade.com/api/oam/v1/{brokerId}/broker-apps/{appCode}/login
Content-Type: application/json
```

The request body is:

```json
{
  "apiKey": "<app id>",
  "params": "",
  "signature": "<hex ECDSA SHA-256 signature>",
  "timestamp": "<Date.now() as a string>"
}
```

The signature is created server-side from the UTF-8 content:

```text
{appId}..{timestamp}
```

using the raw 32-byte P-256 private key supplied as base64 in `BROKER_API_SECRET`. The server wraps that raw key as PKCS#8, signs with SHA-256, and sends the hex signature. Never move this operation to the browser.

Sanitized successful response shape:

```json
{
  "access_token": "<redacted>",
  "expires_in": 3600
}
```

The token is cached server-side and refreshed when it expires or when a quote/candle request receives HTTP 401.

## 2. Quote

```http
GET https://marketapi.settrade.com/api/marketdata/v3/{brokerId}/quote/{symbol}
Authorization: Bearer <access token>
```

Sanitized response shape used by the scanner:

```json
{
  "symbol": "AAPL80",
  "last": 10.6,
  "change": -0.8,
  "percentChange": -7.02,
  "high": 11.3,
  "low": 10.4,
  "totalVolume": 949611
}
```

The normalized application object is `{ symbol, price: last, changePercent: percentChange, change, high, low, volume: totalVolume, source: "settrade", timestamp }`.

## 3. Daily candlesticks

```http
GET https://marketapi.settrade.com/api/techchart/v3/{brokerId}/candlesticks?symbol={symbol}&interval=1d&limit=100
Authorization: Bearer <access token>
```

Sanitized response shape expected by the technical scanner:

```json
{
  "time": [1719792000, 1719878400],
  "open": [10.1, 10.4],
  "high": [10.7, 10.8],
  "low": [9.9, 10.2],
  "close": [10.4, 10.6],
  "volume": [120000, 180000]
}
```

The scanner requires at least 75 closes and requests 100 daily candles. It calculates EMA 25/50/75, RSI, MACD, ATR, and Camarilla levels locally; those calculations are not Settrade endpoints.

## Existing source mapping

- Login/signature/token cache: `server/services/marketDataService.ts`
- Quote and candlestick paths: `server/services/dr80ScannerService.ts`
- Integration health check: `dr80Scanner.getIntegrationStatus`
- Full scanner: `dr80Scanner.getTodaysPicks`

To verify a running backend without exposing secrets, call the health procedure and check `ok: true` and `sampleQuote.source: "settrade"`.
