import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { fetchPriceData } from "../services/marketDataService";

/**
 * Get real-time DR stock price from ALGO_EQ API
 */
export async function getDRPrice(symbol: string): Promise<{
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
} | null> {
  try {
    const data = await fetchPriceData(symbol);
    return {
      symbol: data.symbol || symbol,
      price: data.price,
      currency: "THB",
      timestamp: data.timestamp.toISOString(),
    };
  } catch (error) {
    console.error(`[algoEq] Error fetching Settrade price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get multiple DR stock prices
 */
async function getDRPrices(symbols: string[]): Promise<
  Array<{
    symbol: string;
    price: number;
    currency: string;
    timestamp: string;
  }>
> {
  const prices = await Promise.all(symbols.map((symbol) => getDRPrice(symbol)));
  return prices.filter((p) => p !== null) as Array<{
    symbol: string;
    price: number;
    currency: string;
    timestamp: string;
  }>;
}

export const algoEqRouter = router({
  /**
   * Get real-time price for a single DR stock
   */
  getPrice: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      const price = await getDRPrice(input.symbol);
      return price;
    }),

  /**
   * Get real-time prices for multiple DR stocks
   */
  getPrices: publicProcedure
    .input(z.object({ symbols: z.array(z.string()) }))
    .query(async ({ input }) => {
      const prices = await getDRPrices(input.symbols);
      return prices;
    }),

  /**
   * Update position with current price from ALGO_EQ
   */
  updatePositionPrice: protectedProcedure
    .input(
      z.object({
        positionId: z.number(),
        symbol: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const priceData = await getDRPrice(input.symbol);

      if (!priceData) {
        throw new Error(`Failed to fetch price for ${input.symbol}`);
      }

      return {
        positionId: input.positionId,
        currentPrice: priceData.price,
        timestamp: priceData.timestamp,
      };
    }),

  /**
   * Check if position has hit TP or SL
   */
  checkAlerts: protectedProcedure
    .input(
      z.object({
        symbol: z.string(),
        entryPrice: z.number(),
        stopLoss: z.number(),
        takeProfit: z.number(),
      })
    )
    .query(async ({ input }) => {
      const priceData = await getDRPrice(input.symbol);

      if (!priceData) {
        return {
          symbol: input.symbol,
          currentPrice: null,
          hitSL: false,
          hitTP: false,
        };
      }

      const currentPrice = priceData.price;
      const hitSL = currentPrice <= input.stopLoss;
      const hitTP = currentPrice >= input.takeProfit;

      return {
        symbol: input.symbol,
        currentPrice,
        hitSL,
        hitTP,
        pnl: ((currentPrice - input.entryPrice) / input.entryPrice) * 100,
      };
    }),
});
