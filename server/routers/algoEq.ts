import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import axios from "axios";

const ALGO_EQ_BASE_URL = "https://api.algoequity.com/v1";
const APP_ID = process.env.ALGO_EQ_APP_ID;
const SECRET = process.env.ALGO_EQ_SECRET;

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
    if (!APP_ID || !SECRET) {
      console.error("[ALGO_EQ] Missing API credentials");
      return null;
    }

    const response = await axios.get(`${ALGO_EQ_BASE_URL}/quote`, {
      params: {
        app_id: APP_ID,
        symbol: symbol,
      },
      headers: {
        Authorization: `Bearer ${SECRET}`,
      },
      timeout: 10000,
    });

    if (response.data && response.data.data) {
      const data = response.data.data;
      return {
        symbol: data.symbol || symbol,
        price: parseFloat(data.price) || 0,
        currency: data.currency || "THB",
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`[ALGO_EQ] Error fetching price for ${symbol}:`, error);
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
