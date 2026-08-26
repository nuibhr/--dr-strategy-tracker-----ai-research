import { protectedProcedure, router } from "../_core/trpc";
import { callDataApi } from "../_core/dataApi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarketIndex {
  name: string;
  symbol: string;
  value: string;
  change: string;
  changePct: number;
  positive: boolean;
}

// ─── In-memory cache (15 min) ─────────────────────────────────────────────────
let cachedData: MarketIndex[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ─── Symbols ──────────────────────────────────────────────────────────────────
// SET index = ^SET.BK, NASDAQ = ^IXIC, S&P 500 = ^GSPC, NIKKEI = ^N225, HSI = ^HSI
const INDICES = [
  { name: "SET", symbol: "^SET.BK" },
  { name: "NASDAQ", symbol: "^IXIC" },
  { name: "S&P 500", symbol: "^GSPC" },
  { name: "NIKKEI 225", symbol: "^N225" },
  { name: "HSI", symbol: "^HSI" },
];

async function fetchIndexQuote(symbol: string): Promise<{ price: number; changePct: number; change: number } | null> {
  try {
    const data = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval: "1d",
        range: "5d",
        events: "div,split",
      },
    }) as Record<string, unknown>;

    const chart = data?.chart as Record<string, unknown>;
    const result = (chart?.result as Record<string, unknown>[])?.[0];
    if (!result) return null;

    const meta = result.meta as Record<string, unknown>;
    const price = (meta?.regularMarketPrice as number) ?? 0;
    const prevClose = (meta?.chartPreviousClose as number) ?? (meta?.previousClose as number) ?? 0;
    const change = prevClose > 0 ? price - prevClose : 0;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return { price, changePct, change };
  } catch (err) {
    console.error(`[marketSummary] Failed to fetch ${symbol}:`, err);
    return null;
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const marketSummaryRouter = router({
  getIndices: protectedProcedure.query(async () => {
    const now = Date.now();
    if (cachedData && now < cacheExpiry) {
      return { indices: cachedData, fromCache: true, updatedAt: cacheExpiry - CACHE_TTL };
    }

    console.log("[marketSummary] Fetching real market data from Yahoo Finance...");

    const results = await Promise.allSettled(
      INDICES.map(async (idx) => {
        const quote = await fetchIndexQuote(idx.symbol);
        if (!quote) return null;
        const positive = quote.changePct >= 0;
        return {
          name: idx.name,
          symbol: idx.symbol,
          value: formatNumber(quote.price),
          change: `${positive ? "+" : ""}${quote.changePct.toFixed(2)}%`,
          changePct: quote.changePct,
          positive,
        } as MarketIndex;
      })
    );

    const indices: MarketIndex[] = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((x): x is MarketIndex => x !== null);

    if (indices.length > 0) {
      cachedData = indices;
      cacheExpiry = now + CACHE_TTL;
    }

    return { indices, fromCache: false, updatedAt: now };
  }),
});
