/**
 * DR80 Scanner Router
 * Provides tRPC procedures for scanning DR80 symbols
 * and returning daily top picks with entry plans.
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { scanDR80, DR80_UNIVERSE } from "../services/dr80ScannerService";
import { fetchPriceData, getMarketDataStatus } from "../services/marketDataService";
import { formatDR80ScanMessage, sendTelegramMessage } from "../services/telegramService";

// Simple in-memory cache for today's scan results
interface ScanCache {
  date: string;       // YYYY-MM-DD
  results: Awaited<ReturnType<typeof scanDR80>>;
  scannedAt: Date;
}

let scanCache: ScanCache | null = null;

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export const dr80ScannerRouter = router({
  /**
   * Get today's top 2 DR80 picks.
   * Uses cache if already scanned today.
   */
  getTodaysPicks: publicProcedure
    .input(z.object({ forceRefresh: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const today = getTodayDate();
      const forceRefresh = input?.forceRefresh ?? false;

      // Return cached results if same day and not forcing refresh
      if (!forceRefresh && scanCache && scanCache.date === today) {
        return {
          picks: scanCache.results,
          scannedAt: scanCache.scannedAt,
          fromCache: true,
          date: today,
        };
      }

      try {
        const results = await scanDR80(2);
        scanCache = {
          date: today,
          results,
          scannedAt: new Date(),
        };

        return {
          picks: results,
          scannedAt: scanCache.scannedAt,
          fromCache: false,
          date: today,
        };
      } catch (err) {
        console.error("[dr80Scanner] Scan failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to scan DR80 symbols",
        });
      }
    }),

  /**
   * Get full scan results for all DR80 symbols (for analysis/debugging).
   */
  getFullScan: publicProcedure
    .input(z.object({ topN: z.number().min(1).max(17).optional() }).optional())
    .query(async ({ input }) => {
      const topN = input?.topN ?? 17;
      try {
        const results = await scanDR80(topN);
        return {
          picks: results,
          scannedAt: new Date(),
          total: results.length,
          universe: DR80_UNIVERSE.length,
        };
      } catch (err) {
        console.error("[dr80Scanner] Full scan failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to scan DR80 symbols",
        });
      }
    }),

  /**
   * Get the DR80 universe list.
   */
  getUniverse: publicProcedure.query(() => {
    return { symbols: DR80_UNIVERSE, count: DR80_UNIVERSE.length };
  }),

  /**
   * Check live integration status for Settrade and Telegram.
   */
  getIntegrationStatus: publicProcedure.query(async () => {
    const market = getMarketDataStatus();
    const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

    let sampleQuote: Awaited<ReturnType<typeof fetchPriceData>> | null = null;
    let marketError: string | null = null;

    try {
      sampleQuote = await fetchPriceData("AAPL80");
    } catch (error) {
      marketError = error instanceof Error ? error.message : String(error);
    }

    return {
      market,
      telegram: {
        configured: telegramConfigured,
        chatIdConfigured: Boolean(process.env.TELEGRAM_CHAT_ID),
        botTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      },
      sampleQuote,
      marketError,
      ok: market.hasCredentials && sampleQuote?.source === "settrade" && telegramConfigured,
    };
  }),

  /**
   * Scan and send the latest DR80 result to Telegram.
   */
  sendTodaysPicksToTelegram: publicProcedure
    .input(z.object({ forceRefresh: z.boolean().optional() }).optional())
    .mutation(async ({ input }) => {
      const today = getTodayDate();
      const forceRefresh = input?.forceRefresh ?? false;
      let results = scanCache?.date === today && !forceRefresh ? scanCache.results : null;

      if (!results) {
        results = await scanDR80(2);
        scanCache = {
          date: today,
          results,
          scannedAt: new Date(),
        };
      }

      const message = formatDR80ScanMessage(results, today, DR80_UNIVERSE.length);
      const sent = await sendTelegramMessage(message, "HTML");

      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Telegram send failed. Check bot token and chat ID.",
        });
      }

      return {
        success: true,
        sentAt: new Date(),
        count: results.length,
      };
    }),
});
