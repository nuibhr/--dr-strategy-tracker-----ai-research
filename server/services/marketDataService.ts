/**
 * Market Data Service
 * Fetches real DR price data from Settrade Open API
 * Uses ECDSA signature authentication (secp256r1 / P-256)
 *
 * Credentials required:
 *   BROKER_APP_ID    - Settrade App ID
 *   BROKER_API_SECRET - Settrade App Secret (base64-encoded raw P-256 private key)
 *   BROKER_ID        - Broker code (default: "022" for TRINITY)
 *   BROKER_APP_CODE  - App code (default: "ALGO_EQ")
 */

import crypto from "crypto";

export interface PriceData {
  symbol: string;
  price: number;
  changePercent: number;
  change?: number;
  high?: number;
  low?: number;
  volume?: number;
  source: string;
  timestamp: Date;
}

// ─── Config ──────────────────────────────────────────────────────────────────

// BROKER_* is the canonical naming. Keep the SETTRADE_* aliases so older
// Manus deployments do not silently lose their existing credentials.
const APP_ID = process.env.BROKER_APP_ID ?? process.env.SETTRADE_APP_ID ?? "";
const SECRET = process.env.BROKER_API_SECRET ?? process.env.SETTRADE_APP_SECRET ?? "";
const BROKER_ID = process.env.SETTRADE_BROKER_ID ?? "022";
const APP_CODE = process.env.SETTRADE_APP_CODE ?? "ALGO_EQ";
const LOGIN_URL = `https://open-api.settrade.com/api/oam/v1/${BROKER_ID}/broker-apps/${APP_CODE}/login`;
const MARKET_BASE = `https://marketapi.settrade.com/api/marketdata/v3/${BROKER_ID}`;

// ─── Token Cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenRefreshPromise: Promise<string> | null = null;

// ─── ECDSA Signature (P-256 / secp256r1) ─────────────────────────────────────

/**
 * Wrap a raw 32-byte P-256 private key into PKCS#8 DER format
 * so Node.js crypto can import it.
 */
function rawPrivKeyToPkcs8Der(rawKey: Buffer): Buffer {
  // PKCS#8 DER header for P-256 (OID 1.2.840.10045.2.1 + 1.2.840.10045.3.1.7)
  const header = Buffer.from(
    "304102010030130607" +
      "2a8648ce3d020106" +
      "082a8648ce3d030107" +
      "042730250201010420",
    "hex"
  );
  return Buffer.concat([header, rawKey]);
}

function createEcdsaSignature(secret: string, content: string): string {
  let keyBytes = Buffer.from(secret, "base64");
  // Strip leading 0x00 padding byte if present (33 → 32 bytes)
  if (keyBytes.length === 33 && keyBytes[0] === 0x00) {
    keyBytes = keyBytes.subarray(1);
  }
  const pkcs8Der = rawPrivKeyToPkcs8Der(keyBytes);
  const privateKey = crypto.createPrivateKey({
    key: pkcs8Der,
    format: "der",
    type: "pkcs8",
  });
  const sign = crypto.createSign("SHA256");
  sign.update(content);
  return sign.sign(privateKey).toString("hex");
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getAccessToken(forceRefresh = false): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (!forceRefresh && cachedToken && now < tokenExpiresAt - 60) {
    return cachedToken;
  }

  if (!forceRefresh && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  if (forceRefresh) {
    cachedToken = null;
    tokenExpiresAt = 0;
  }

  tokenRefreshPromise = refreshAccessToken();
  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = null;
  }
}

async function refreshAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const ts = Date.now().toString();
  const content = `${APP_ID}..${ts}`;
  const signature = createEcdsaSignature(SECRET, content);

  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: APP_ID, params: "", signature, timestamp: ts }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Settrade login failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in ?? 3600);
  console.log("[marketDataService] Settrade token refreshed");
  return cachedToken;
}

// ─── Fetch Quote ──────────────────────────────────────────────────────────────

interface SettradeQuote {
  symbol: string;
  last: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  totalVolume: number;
}

async function fetchSettradeQuote(symbol: string): Promise<SettradeQuote> {
  const url = `${MARKET_BASE}/quote/${symbol}`;
  let token = await getAccessToken();
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    console.warn(`[marketDataService] Settrade token rejected for ${symbol}; refreshing once`);
    token = await getAccessToken(true);
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Settrade quote failed for ${symbol} (${res.status}): ${err}`);
  }

  return (await res.json()) as SettradeQuote;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function hasCredentials(): boolean {
  return !!(APP_ID && SECRET);
}

export function getMarketDataStatus() {
  return {
    provider: "settrade",
    brokerId: BROKER_ID,
    appCode: APP_CODE,
    hasCredentials: hasCredentials(),
    tokenCached: Boolean(cachedToken && Math.floor(Date.now() / 1000) < tokenExpiresAt - 60),
  };
}

/**
 * Fetch real-time price data for a DR symbol.
 * Never fabricates a price: missing credentials or an API failure is returned
 * to the caller so the UI can show that live data is unavailable.
 */
export async function fetchPriceData(symbol: string): Promise<PriceData> {
  if (!hasCredentials()) {
    throw new Error("Settrade credentials are not configured; live price unavailable");
  }

  const q = await fetchSettradeQuote(symbol);
  return {
    symbol: q.symbol,
    price: q.last,
    change: q.change,
    changePercent: q.percentChange,
    high: q.high,
    low: q.low,
    volume: q.totalVolume,
    source: "settrade",
    timestamp: new Date(),
  };
}

/**
 * Fetch prices for multiple symbols in parallel.
 */
export async function fetchMultiplePrices(symbols: string[]): Promise<PriceData[]> {
  return Promise.all(symbols.map((s) => fetchPriceData(s)));
}
