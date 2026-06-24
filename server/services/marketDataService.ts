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

// Mock price data for testing
const MOCK_PRICES: Record<string, { basePrice: number; volatility: number }> = {
  AAPL80: { basePrice: 6.50, volatility: 0.02 },
  NVDA80: { basePrice: 7.20, volatility: 0.03 },
  TSLA80: { basePrice: 5.80, volatility: 0.04 },
  META80: { basePrice: 4.50, volatility: 0.025 },
  GOOG80: { basePrice: 6.80, volatility: 0.015 },
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
