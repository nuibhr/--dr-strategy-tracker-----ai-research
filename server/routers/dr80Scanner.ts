/**
 * DR80 Scanner Router
 * Provides tRPC procedures for scanning DR80 symbols
 * and returning daily top picks with entry plans.
 */

import { router, publicProcedure, scannerReadProcedure, adminProcedure } from "../_core/trpc";
import { isLanScannerRequest } from "../_core/lanAccess";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { scanDR80 } from "../services/dr80ScannerService";
import { getDRUniverse } from "../services/drUniverse";
import { fetchPriceData, getMarketDataStatus } from "../services/marketDataService";
import { formatDR80ScanMessage, sendTelegramMessage } from "../services/telegramService";

// Simple in-memory cache for today's scan results
interface ScanCache {
  date: string;       // YYYY-MM-DD
  results: Awaited<ReturnType<typeof scanDR80>>;
  scannedAt: Date;
}

let scanCache: ScanCache | null = null;
let scanInFlight: Promise<ScanCache> | null = null;

async function getScan(forceRefresh: boolean, lanRequest = false) {
  const today = getTodayDate();
  // All LAN viewers share results and a running scan. Limit manual refresh to once/5 minutes.
  if (scanCache?.date === today && (!forceRefresh ||
    (lanRequest && Date.now() - scanCache.scannedAt.getTime() < 300_000))) {
    return { ...scanCache, fromCache: true };
  }
  if (!scanInFlight) {
    scanInFlight = scanDR80(4).then(results => {
      scanCache = { date: today, results, scannedAt: new Date() };
      return scanCache;
    }).finally(() => { scanInFlight = null; });
  }
  return { ...await scanInFlight, fromCache: false };
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

let integrationCache: { expiresAt: number; value: Awaited<ReturnType<typeof loadIntegrationStatus>> } | null = null;
let integrationInFlight: Promise<Awaited<ReturnType<typeof loadIntegrationStatus>>> | null = null;

async function loadIntegrationStatus() {
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
}

export const dr80ScannerRouter = router({
  getAccessMode: publicProcedure.query(({ ctx }) => ({
    lanPublicScanner: isLanScannerRequest(ctx.req),
  })),
  /**
   * Get today's top 4 DR/DRx picks.
   * Uses cache if already scanned today.
   */
  getTodaysPicks: scannerReadProcedure
    .input(z.object({ forceRefresh: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const forceRefresh = input?.forceRefresh ?? false;

      try {
        const scan = await getScan(forceRefresh, isLanScannerRequest(ctx.req));
        return {
          picks: scan.results,
          scannedAt: scan.scannedAt,
          fromCache: scan.fromCache,
          date: scan.date,
          universe: getDRUniverse().length,
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
  getFullScan: adminProcedure
    .input(z.object({ topN: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => {
      const universe = getDRUniverse();
      const topN = input?.topN ?? universe.length;
      try {
        const results = await scanDR80(topN);
        return {
          picks: results,
          scannedAt: new Date(),
          total: results.length,
          universe: universe.length,
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
  getUniverse: adminProcedure.query(() => {
    const symbols = getDRUniverse();
    return { symbols, count: symbols.length };
  }),

  /**
   * Check live integration status for Settrade and Telegram.
   */
  getIntegrationStatus: scannerReadProcedure.query(async () => {
    if (integrationCache && Date.now() < integrationCache.expiresAt) return integrationCache.value;
    if (!integrationInFlight) {
      integrationInFlight = loadIntegrationStatus().then(value => {
        integrationCache = { expiresAt: Date.now() + 60_000, value };
        return value;
      }).finally(() => { integrationInFlight = null; });
    }
    return integrationInFlight;
  }),

  /**
   * Scan and send the latest DR80 result to Telegram.
   */
  sendTodaysPicksToTelegram: adminProcedure
    .input(z.object({ forceRefresh: z.boolean().optional() }).optional())
    .mutation(async ({ input }) => {
      const forceRefresh = input?.forceRefresh ?? false;
      const scan = await getScan(forceRefresh);
      const results = scan.results;
      const message = formatDR80ScanMessage(results, scan.date, getDRUniverse().length);
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
