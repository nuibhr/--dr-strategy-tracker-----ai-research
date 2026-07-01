/**
 * DR80 Scanner Service
 * Screens all DR80 symbols using:
 *   1. EMA 25/50/75 alignment (bullish = price > EMA25 > EMA50 > EMA75)
 *   2. Camarilla Pivot (entry near S3, TP at R1/R2, SL at S4)
 *   3. RSI (sweet spot 40-60, avoid >70 overbought)
 *   4. MACD (positive histogram = bullish momentum)
 * Picks top 4 candidates daily.
 */

import { getAccessToken } from "./marketDataService";
import { getDRUniverse } from "./drUniverse";

// ─── DR80 Universe ────────────────────────────────────────────────────────────

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
    const url = `${TECH_BASE}/candlesticks?symbol=${symbol}&interval=1d&limit=${limit}`;
    let token = await getAccessToken();
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      token = await getAccessToken(true);
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    }
    if (!res.ok) return null;
    const data = await res.json() as CandleData;
    return data;
  } catch {
    return null;
  }
}

async function fetchQuote(symbol: string): Promise<{ last: number; percentChange: number } | null> {
  try {
    const url = `${MARKET_BASE}/quote/${symbol}`;
    let token = await getAccessToken();
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      token = await getAccessToken(true);
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    }
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

/**
 * ATR (Average True Range) - ใช้คำนวณ TP/SL ที่สมเหตุสมผลสำหรับ DR ราคาต่ำ
 */
function calcAtr(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hpc = Math.abs(highs[i] - closes[i - 1]);
    const lpc = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(hl, hpc, lpc));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

function roundPrice(value: number): number {
  return Math.max(0.01, Math.round(value * 100) / 100);
}

function chooseEntryPlan(params: {
  currentPrice: number;
  ema25: number;
  camarilla: CamarillaPivots;
  effectiveAtr: number;
}) {
  const { currentPrice, ema25, camarilla: cam, effectiveAtr } = params;
  const buyZoneLow = Math.min(cam.S2, cam.S3);
  const buyZoneHigh = Math.max(cam.S2, cam.S3);
  const isInBuyZone = currentPrice >= buyZoneLow && currentPrice <= buyZoneHigh;

  const candidates = [
    { price: cam.S2, label: "Camarilla S2" },
    { price: (cam.S2 + cam.S3) / 2, label: "กลางโซน Camarilla S2-S3" },
    { price: cam.S3, label: "Camarilla S3" },
    { price: ema25, label: "EMA25 pullback" },
    { price: currentPrice - effectiveAtr * 0.75, label: "ย่อ 0.75 ATR" },
  ]
    .filter(candidate => Number.isFinite(candidate.price))
    .filter(candidate => candidate.price > 0)
    .filter(candidate => candidate.price <= currentPrice * 1.002)
    .filter(candidate => candidate.price >= currentPrice * 0.92);

  const scored = candidates.map(candidate => {
    const pullbackPct = (currentPrice - candidate.price) / currentPrice;
    let score = 0;

    if (candidate.price >= buyZoneLow && candidate.price <= buyZoneHigh) score += 4;
    if (Math.abs(candidate.price - cam.S3) <= effectiveAtr * 0.35) score += 2;
    if (Math.abs(candidate.price - ema25) <= effectiveAtr * 0.35) score += 2;
    if (pullbackPct >= 0.005 && pullbackPct <= 0.04) score += 2;
    else if (pullbackPct >= 0 && pullbackPct < 0.005) score += isInBuyZone ? 2 : 0;
    else if (pullbackPct > 0.06) score -= 1;

    return { ...candidate, score };
  });

  scored.sort((a, b) => b.score - a.score || b.price - a.price);
  const selected = scored[0] ?? {
    price: currentPrice - effectiveAtr * 0.75,
    label: "ย่อ 0.75 ATR",
    score: 0,
  };

  const rawEntry = isInBuyZone && currentPrice <= selected.price * 1.003
    ? currentPrice
    : selected.price;
  const entry = roundPrice(Math.min(rawEntry, currentPrice));

  const slByAtr = entry - effectiveAtr * 1.2;
  const slByCamarilla = cam.S4 < entry ? cam.S4 - effectiveAtr * 0.1 : slByAtr;
  const sl = roundPrice(Math.min(slByAtr, slByCamarilla));

  const tp1Candidates = [entry + effectiveAtr * 1.5, cam.pivot, cam.R1].filter(price => price > entry);
  const tp2Candidates = [entry + effectiveAtr * 2.8, cam.R2, cam.R3].filter(price => price > entry);
  const tp1 = roundPrice(Math.max(...tp1Candidates));
  const tp2 = roundPrice(Math.max(...tp2Candidates));

  const riskReward = entry - sl > 0
    ? Math.round(((tp1 - entry) / (entry - sl)) * 100) / 100
    : 0;

  const pullbackPct = Math.max(0, ((currentPrice - entry) / currentPrice) * 100);
  const label = entry === roundPrice(currentPrice)
    ? "ราคาอยู่ใน buy zone แล้ว"
    : `รอรับ ${selected.label} (-${pullbackPct.toFixed(1)}%)`;

  return { entry, tp1, tp2, sl, riskReward, label };
}

// ─── Score a Symbol ───────────────────────────────────────────────────────────

async function scoreSymbol(symbol: string): Promise<DR80ScanResult | null> {
  const quote = await fetchQuote(symbol);
  if (!quote) return null;

  const candle = await fetchCandles(symbol, 100);
  if (!candle) return null;
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
  // ผ่านอย่างน้อย 1 เงื่อนไข EMA ก็ถือว่าเป็นตัวเลือกได้

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

  // ── ATR (14 วัน) ──
  const atr = calcAtr(highs, lows, closes, 14);

  // ── Camarilla (ใช้ Weekly range 5 วัน เพื่อให้ TP/SL กว้างพอ) ──
  const lookback = 5;
  const recentHighs = highs.slice(-lookback - 1, -1);
  const recentLows = lows.slice(-lookback - 1, -1);
  const weeklyHigh = Math.max(...recentHighs);
  const weeklyLow = Math.min(...recentLows);
  const prevClose = closes[closes.length - 2] ?? closes[closes.length - 1];
  const cam = calcCamarilla(weeklyHigh, weeklyLow, prevClose);

  let camScore = 0;
  if (currentPrice > cam.pivot) camScore++;
  if (currentPrice >= cam.S3 && currentPrice <= cam.R3) camScore++;
  if (currentPrice >= cam.S2 && currentPrice <= cam.S3) camScore += 2; // ideal buy zone

  // ── Entry Plan ──
  // ไม่ไล่ราคาปัจจุบัน: เลือกจุดรอรับจาก confluence ของ Camarilla S2/S3, EMA25 และ ATR pullback
  const minAtr = currentPrice * 0.005;
  const effectiveAtr = Math.max(atr, minAtr);
  const tradePlan = chooseEntryPlan({ currentPrice, ema25, camarilla: cam, effectiveAtr });

  // ── Total Score ──
  // EMA: ผ่านอย่างน้อย 1 เงื่อนไขก็นับคะแนนได้ (emaScore >= 1)
  const emaContrib = emaScore >= 1 ? emaScore * 2 : 0;
  const totalScore = emaContrib + camScore * 2 + rsiScore + macdScore;

  // ── Reason (Thai) ──
  const reasons: string[] = [];
  if (emaAligned) reasons.push("EMA 25/50/75 เรียงตัวขึ้น");
  else if (emaScore >= 2) reasons.push("EMA เริ่มเรียงตัวขึ้น");
  if (rsi >= 40 && rsi <= 60) reasons.push(`RSI ${rsi} อยู่ในโซนดี`);
  else if (rsi < 40) reasons.push(`RSI ${rsi} ใกล้ oversold`);
  if (histogram > 0) reasons.push("MACD momentum เป็นบวก");
  if (camScore >= 2) reasons.push(`ราคาใกล้ Camarilla S3 (Buy Zone)`);
  else if (currentPrice > cam.pivot) reasons.push("ราคาอยู่เหนือ Pivot");
  reasons.push(tradePlan.label);

  // EMA reason: ผ่อนเงื่อนไขเป็น >= 1
  if (emaScore === 0) reasons.push("EMA ยังไม่เรียงตัว (ข้ามเงื่อนไขนี้)");
  const reason = reasons.join(" | ") || "Technical setup น่าสนใจ";

  return {
    symbol, currentPrice, changePct,
    ema25, ema50, ema75, emaAligned, emaScore,
    rsi, rsiScore,
    macdLine, signalLine, histogram, macdScore,
    camarilla: cam, camScore,
    entry: tradePlan.entry,
    tp1: tradePlan.tp1,
    tp2: tradePlan.tp2,
    sl: tradePlan.sl,
    riskReward: tradePlan.riskReward,
    totalScore,
    reason,
  };
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

/**
 * Scan all DR80 symbols and return top N picks sorted by score.
 */
export async function scanDR80(topN = 4): Promise<DR80ScanResult[]> {
  const universe = getDRUniverse();
  console.log(`[dr80Scanner] Scanning ${universe.length} symbols...`);

  // Scan in parallel (batches of 5 to avoid rate limiting)
  const results: DR80ScanResult[] = [];
  const batchSize = Math.max(1, Math.min(20, Number(process.env.DR_SCAN_BATCH_SIZE ?? 8)));

  for (let i = 0; i < universe.length; i += batchSize) {
    const batch = universe.slice(i, i + batchSize);
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
