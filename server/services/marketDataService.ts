/**
 * Market Data Service
 * Handles fetching price data from market APIs with mock fallback
 * Currently uses mock data, can be extended to support real APIs like ALGO_EQ
 */

export interface PriceData {
  symbol: string;
  price: number;
  changePercent: number;
  volume?: number;
  source: string;
  timestamp: Date;
}

// Mock price data - Real THB DR prices (June 2025)
// Formula: DR Price (THB) = Stock Price (USD) × FX Rate (USD/THB ~33.5) / Conversion Ratio (1000)
// AAPL80: AAPL $293.17 × 33.5 / 1000 = 9.82 THB | entry=9.62, TP1=10.31, TP2=10.80, SL=9.33
// NVDA80: NVDA $198.91 × 33.5 / 1000 = 6.66 THB | entry=6.53, TP1=7.00, TP2=7.33, SL=6.33
// TSLA80: TSLA $375.47 × 33.5 / 1000 = 12.58 THB | entry=12.33, TP1=13.21, TP2=13.84, SL=11.95
// META80: META $557.80 × 33.5 / 1000 = 18.69 THB | entry=18.31, TP1=19.62, TP2=20.55, SL=17.75
// GOOG80: GOOG $345.03 × 33.5 / 1000 = 11.56 THB | entry=11.33, TP1=12.14, TP2=12.71, SL=10.98
const MOCK_PRICES: Record<string, { basePrice: number; volatility: number }> = {
  AAPL80: { basePrice: 9.82,  volatility: 0.04 },  // current ~9.82 THB, can swing to TP1=10.31 or SL=9.33
  NVDA80: { basePrice: 6.66,  volatility: 0.04 },  // current ~6.66 THB, can swing to TP1=7.00 or SL=6.33
  TSLA80: { basePrice: 12.58, volatility: 0.05 },  // current ~12.58 THB, can swing to TP1=13.21 or SL=11.95
  META80: { basePrice: 18.69, volatility: 0.04 },  // current ~18.69 THB, can swing to TP1=19.62 or SL=17.75
  GOOG80: { basePrice: 11.56, volatility: 0.04 },  // current ~11.56 THB, can swing to TP1=12.14 or SL=10.98
};

/**
 * Generate mock price with slight variation
 * Used for testing before real API integration
 */
function generateMockPrice(symbol: string): number {
  const config = MOCK_PRICES[symbol];
  if (!config) return 0;

  // Add random variation within volatility range
  const variation = (Math.random() - 0.5) * 2 * config.volatility;
  return config.basePrice * (1 + variation);
}

/**
 * Fetch price data from market API
 * Currently uses mock data, can be extended for real APIs
 */
export async function fetchPriceData(symbol: string): Promise<PriceData> {
  try {
    // TODO: Replace with real API call when BROKER_API_KEY is available
    // For now, use mock data
    const price = generateMockPrice(symbol);
    const previousPrice = MOCK_PRICES[symbol]?.basePrice || price;
    const changePercent = ((price - previousPrice) / previousPrice) * 100;

    return {
      symbol,
      price,
      changePercent,
      volume: Math.floor(Math.random() * 1000000),
      source: "mock",
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`[marketDataService] Error fetching price for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch prices for multiple symbols
 */
export async function fetchMultiplePrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const prices = await Promise.all(symbols.map((symbol) => fetchPriceData(symbol)));
    return prices;
  } catch (error) {
    console.error("[marketDataService] Error fetching multiple prices:", error);
    throw error;
  }
}

/**
 * Get mock price configuration for a symbol
 * Used for testing and development
 */
export function getMockPriceConfig(symbol: string) {
  return MOCK_PRICES[symbol] || null;
}

/**
 * Update mock price configuration
 * Used for testing different scenarios
 */
export function updateMockPriceConfig(symbol: string, basePrice: number, volatility: number) {
  MOCK_PRICES[symbol] = { basePrice, volatility };
}
