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

const APP_ID = process.env.BROKER_APP_ID ?? "";
const SECRET = process.env.BROKER_API_SECRET ?? "";
const BROKER_ID = process.env.SETTRADE_BROKER_ID ?? "022";
const APP_CODE = process.env.SETTRADE_APP_CODE ?? "ALGO_EQ";
const LOGIN_URL = `https://open-api.settrade.com/api/oam/v1/${BROKER_ID}/broker-apps/${APP_CODE}/login`;
const MARKET_BASE = `https://marketapi.settrade.com/api/marketdata/v3/${BROKER_ID}`;

// ─── Token Cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

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

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiresAt - 60) {
    return cachedToken;
  }

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
  const token = await getAccessToken();
  const url = `${MARKET_BASE}/quote/${symbol}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Settrade quote failed for ${symbol} (${res.status}): ${err}`);
  }

  return (await res.json()) as SettradeQuote;
}

// ─── Mock Fallback ────────────────────────────────────────────────────────────

const MOCK_PRICES: Record<string, { basePrice: number; volatility: number }> = {
  AAPL80: { basePrice: 9.75, volatility: 0.03 },
  NVDA80: { basePrice: 33.25, volatility: 0.03 },
  TSLA80: { basePrice: 2.52, volatility: 0.04 },
  META80: { basePrice: 2.34, volatility: 0.03 },
  GOOG80: { basePrice: 5.75, volatility: 0.03 },
};

function generateMockPrice(symbol: string): number {
  const config = MOCK_PRICES[symbol];
  if (!config) return 0;
  const variation = (Math.random() - 0.5) * 2 * config.volatility;
  return parseFloat((config.basePrice * (1 + variation)).toFixed(2));
}

// ─── Public API ───────────────────────────────────────────────────────────────

function hasCredentials(): boolean {
  return !!(APP_ID && SECRET);
}

/**
 * Fetch real-time price data for a DR symbol.
 * Falls back to mock data if credentials are missing or API call fails.
 */
export async function fetchPriceData(symbol: string): Promise<PriceData> {
  if (hasCredentials()) {
    try {
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
    } catch (err) {
      console.error(`[marketDataService] Settrade API error for ${symbol}, falling back to mock:`, err);
    }
  }

  // Mock fallback
  const price = generateMockPrice(symbol);
  const base = MOCK_PRICES[symbol]?.basePrice ?? price;
  return {
    symbol,
    price,
    changePercent: parseFloat((((price - base) / base) * 100).toFixed(2)),
    volume: Math.floor(Math.random() * 1_000_000),
    source: "mock",
    timestamp: new Date(),
  };
}

/**
 * Fetch prices for multiple symbols in parallel.
 */
export async function fetchMultiplePrices(symbols: string[]): Promise<PriceData[]> {
  return Promise.all(symbols.map((s) => fetchPriceData(s)));
}

/** @deprecated Use fetchPriceData instead */
export function getMockPriceConfig(symbol: string) {
  return MOCK_PRICES[symbol] ?? null;
}

/** @deprecated Use fetchPriceData instead */
export function updateMockPriceConfig(symbol: string, basePrice: number, volatility: number) {
  MOCK_PRICES[symbol] = { basePrice, volatility };
}
