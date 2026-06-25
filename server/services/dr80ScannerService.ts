/**
 * DR80 Scanner Service
 * Screens all DR80 symbols using:
 *   1. EMA 25/50/75 alignment (bullish = price > EMA25 > EMA50 > EMA75)
 *   2. Camarilla Pivot (entry near S3, TP at R1/R2, SL at S4)
 *   3. RSI (sweet spot 40-60, avoid >70 overbought)
 *   4. MACD (positive histogram = bullish momentum)
 * Picks top 2 candidates daily.
 */

import { getAccessToken } from "./marketDataService";

// ─── DR80 Universe ────────────────────────────────────────────────────────────

export const DR80_UNIVERSE = [
  "AAPL80", "NVDA80", "TSLA80", "META80", "GOOG80",
  "AMZN80", "MSFT80", "AMD80",  "NFLX80", "BABA80",
  "JD80",   "CRM80",  "AVGO80", "MA80",   "COIN80",
  "CRWD80", "BIDU80",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandleData {
  time: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume?: number[];
}

export interface CamarillaPivots {
  pivot: number;
  R1: number; R2: number; R3: number; R4: number;
  S1: number; S2: number; S3: number; S4: number;
}

export interface DR80ScanResult {
  symbol: string;
  currentPrice: number;
  changePct: number;
  // EMA
  ema25: number;
  ema50: number;
  ema75: number;
  emaAligned: boolean;   // price > EMA25 > EMA50 > EMA75
  emaScore: number;      // 0-3
  // RSI
  rsi: number;
  rsiScore: number;      // 0-3
  // MACD
  macdLine: number;
  signalLine: number;
  histogram: number;
  macdScore: number;     // 0-3
  // Camarilla
  camarilla: CamarillaPivots;
  camScore: number;      // 0-4
  // Entry Plan
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  riskReward: number;
  // Total
  totalScore: number;
  reason: string;        // Thai explanation
}

// ─── Candlestick Fetch ────────────────────────────────────────────────────────

const BROKER_ID = process.env.SETTRADE_BROKER_ID ?? "022";
const TECH_BASE = `https://marketapi.settrade.com/api/techchart/v3/${BROKER_ID}`;
const MARKET_BASE = `https://marketapi.settrade.com/api/marketdata/v3/${BROKER_ID}`;

async function fetchCandles(symbol: string, limit = 100): Promise<CandleData | null> {
  try {
    const token = await getAccessToken();
    const url = `${TECH_BASE}/candlesticks?symbol=${symbol}&interval=1d&limit=${limit}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json() as CandleData;
    return data;
  } catch {
    return null;
  }
}

async function fetchQuote(symbol: string): Promise<{ last: number; percentChange: number } | null> {
  try {
    const token = await getAccessToken();
    const url = `${MARKET_BASE}/quote/${symbol}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return await res.json() as { last: number; percentChange: number };
  } catch {
    return null;
  }
}

// ─── Technical Indicators ─────────────────────────────────────────────────────

function calcEma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return Math.round(ema * 10000) / 10000;
}

function calcRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

function calcMacd(
  closes: number[],
  fast = 12, slow = 26, signal = 9
): { macdLine: number; signalLine: number; histogram: number } | null {
  if (closes.length < slow + signal) return null;

  // Build MACD history
  const macdHistory: number[] = [];
  for (let i = slow; i <= closes.length; i++) {
    const ef = calcEma(closes.slice(0, i), fast);
    const es = calcEma(closes.slice(0, i), slow);
    if (ef !== null && es !== null) macdHistory.push(ef - es);
  }
  if (macdHistory.length < signal) return null;

  const macdLine = macdHistory[macdHistory.length - 1];
  const signalLine = calcEma(macdHistory, signal);
  if (signalLine === null) return null;
  const histogram = macdLine - signalLine;

  return {
    macdLine: Math.round(macdLine * 10000) / 10000,
    signalLine: Math.round(signalLine * 10000) / 10000,
    histogram: Math.round(histogram * 10000) / 10000,
  };
}

function calcCamarilla(high: number, low: number, close: number): CamarillaPivots {
  const range = high - low;
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    pivot: r((high + low + close) / 3),
    R1: r(close + range * 1.1 / 12),
    R2: r(close + range * 1.1 / 6),
    R3: r(close + range * 1.1 / 4),
    R4: r(close + range * 1.1 / 2),
    S1: r(close - range * 1.1 / 12),
    S2: r(close - range * 1.1 / 6),
    S3: r(close - range * 1.1 / 4),
    S4: r(close - range * 1.1 / 2),
  };
}

// ─── Score a Symbol ───────────────────────────────────────────────────────────

async function scoreSymbol(symbol: string): Promise<DR80ScanResult | null> {
  const [candle, quote] = await Promise.all([
    fetchCandles(symbol, 100),
    fetchQuote(symbol),
  ]);

  if (!candle || !quote) return null;
  const closes = candle.close ?? [];
  const highs = candle.high ?? [];
  const lows = candle.low ?? [];

  if (closes.length < 75) return null;

  const currentPrice = quote.last;
  const changePct = quote.percentChange ?? 0;

  // ── EMA ──
  const ema25 = calcEma(closes, 25);
  const ema50 = calcEma(closes, 50);
  const ema75 = calcEma(closes, 75);
  if (ema25 === null || ema50 === null || ema75 === null) return null;

  let emaScore = 0;
  if (currentPrice > ema25) emaScore++;
  if (ema25 > ema50) emaScore++;
  if (ema50 > ema75) emaScore++;
  const emaAligned = emaScore === 3;

  // ── RSI ──
  const rsi = calcRsi(closes) ?? 50;
  let rsiScore = 0;
  if (rsi >= 40 && rsi <= 60) rsiScore = 3;
  else if (rsi >= 30 && rsi < 40) rsiScore = 2;
  else if (rsi > 60 && rsi <= 70) rsiScore = 1;
  else if (rsi < 30) rsiScore = 1;
  // rsi > 70 = 0 (overbought, skip)

  // ── MACD ──
  const macdData = calcMacd(closes);
  const macdLine = macdData?.macdLine ?? 0;
  const signalLine = macdData?.signalLine ?? 0;
  const histogram = macdData?.histogram ?? 0;
  let macdScore = 0;
  if (macdLine > signalLine) macdScore++;
  if (histogram > 0) macdScore++;
  // Check if histogram is increasing
  const prevMacd = calcMacd(closes.slice(0, -1));
  if (prevMacd && histogram > prevMacd.histogram) macdScore++;

  // ── Camarilla ──
  const prevHigh = highs[highs.length - 2] ?? highs[highs.length - 1];
  const prevLow = lows[lows.length - 2] ?? lows[lows.length - 1];
  const prevClose = closes[closes.length - 2] ?? closes[closes.length - 1];
  const cam = calcCamarilla(prevHigh, prevLow, prevClose);

  let camScore = 0;
  if (currentPrice > cam.pivot) camScore++;
  if (currentPrice >= cam.S3 && currentPrice <= cam.R3) camScore++;
  if (currentPrice >= cam.S2 && currentPrice <= cam.S3) camScore += 2; // ideal buy zone

  // ── Entry Plan ──
  // Smart entry: if price is already above R1, use R2/R3 as TP
  // If price is near S3, use S3 as entry
  let entry = currentPrice;
  let tp1: number;
  let tp2: number;
  let sl: number;

  if (currentPrice <= cam.S3) {
    // Deep buy zone: entry at S3, TP at R1/R2, SL at S4
    entry = cam.S3;
    tp1 = cam.R1;
    tp2 = cam.R2;
    sl = cam.S4;
  } else if (currentPrice <= cam.pivot) {
    // Below pivot: entry at current, TP at R1/R2, SL at S3
    tp1 = cam.R1;
    tp2 = cam.R2;
    sl = cam.S3;
  } else if (currentPrice <= cam.R1) {
    // Between pivot and R1: entry at current, TP at R2/R3, SL at pivot
    tp1 = cam.R2;
    tp2 = cam.R3;
    sl = cam.pivot;
  } else {
    // Above R1: entry at current, TP at R3/R4, SL at R1
    tp1 = cam.R3;
    tp2 = cam.R4;
    sl = cam.R1;
  }

  const riskReward = entry - sl > 0
    ? Math.round(((tp1 - entry) / (entry - sl)) * 100) / 100
    : 0;

  // ── Total Score ──
  const totalScore = emaScore * 2 + camScore * 2 + rsiScore + macdScore;

  // ── Reason (Thai) ──
  const reasons: string[] = [];
  if (emaAligned) reasons.push("EMA 25/50/75 เรียงตัวขึ้น");
  else if (emaScore >= 2) reasons.push("EMA เริ่มเรียงตัวขึ้น");
  if (rsi >= 40 && rsi <= 60) reasons.push(`RSI ${rsi} อยู่ในโซนดี`);
  else if (rsi < 40) reasons.push(`RSI ${rsi} ใกล้ oversold`);
  if (histogram > 0) reasons.push("MACD momentum เป็นบวก");
  if (camScore >= 2) reasons.push(`ราคาใกล้ Camarilla S3 (Buy Zone)`);
  else if (currentPrice > cam.pivot) reasons.push("ราคาอยู่เหนือ Pivot");

  const reason = reasons.join(" | ") || "Technical setup น่าสนใจ";

  return {
    symbol, currentPrice, changePct,
    ema25, ema50, ema75, emaAligned, emaScore,
    rsi, rsiScore,
    macdLine, signalLine, histogram, macdScore,
    camarilla: cam, camScore,
    entry: Math.round(entry * 100) / 100,
    tp1: Math.round(tp1 * 100) / 100,
    tp2: Math.round(tp2 * 100) / 100,
    sl: Math.round(sl * 100) / 100,
    riskReward,
    totalScore,
    reason,
  };
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

/**
 * Scan all DR80 symbols and return top N picks sorted by score.
 */
export async function scanDR80(topN = 2): Promise<DR80ScanResult[]> {
  console.log(`[dr80Scanner] Scanning ${DR80_UNIVERSE.length} symbols...`);

  // Scan in parallel (batches of 5 to avoid rate limiting)
  const results: DR80ScanResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < DR80_UNIVERSE.length; i += batchSize) {
    const batch = DR80_UNIVERSE.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(scoreSymbol));
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  // Sort by total score descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  console.log(`[dr80Scanner] Scanned ${results.length} symbols, top picks: ${results.slice(0, topN).map(r => r.symbol).join(', ')}`);

  return results.slice(0, topN);
}
