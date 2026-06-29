import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import * as marketDataService from "../services/marketDataService";
import * as calculationService from "../services/calculationService";

// Input validation schemas
const CreateDrPickInput = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  market: z.string().min(1),
  entryDate: z.date(),
  entryPrice: z.string().min(1),
  tp1: z.string().min(1),
  tp2: z.string().min(1),
  sl: z.string().min(1),
  reason: z.string().optional(),
  note: z.string().optional(),
  isActive: z.number().optional().default(1),
});

const UpdateDrPickInput = z.object({
  symbol: z.string().optional(),
  name: z.string().optional(),
  market: z.string().optional(),
  entryDate: z.date().optional(),
  entryPrice: z.string().optional(),
  tp1: z.string().optional(),
  tp2: z.string().optional(),
  sl: z.string().optional(),
  status: z.enum(["Hit TP1", "Hit TP2", "Hit SL", "Near TP", "Near SL", "Waiting", "Closed", "Watchlist"]).optional(),
  reason: z.string().optional(),
  note: z.string().optional(),
  isActive: z.number().optional(),
  closedAt: z.date().nullable().optional(),
});

export const drPicksRouter = router({
  /**
   * Get all DR picks
   */
  list: publicProcedure.query(async () => {
    try {
      const picks = await db.getAllDrPicks();
      // Merge latest price snapshot into each pick
      const picksWithPrices = await Promise.all(picks.map(async (pick) => {
        const latestPrice = await db.getLatestPriceSnapshot(pick.symbol);
        const currentPrice = latestPrice ? parseFloat(latestPrice.price) : parseFloat(pick.entryPrice);
        const returnPct = calculationService.calculateReturnPercent(parseFloat(pick.entryPrice), currentPrice);
        const rr = calculationService.calculateRiskRewardRatio(parseFloat(pick.entryPrice), parseFloat(pick.tp1), parseFloat(pick.sl));
        return {
          ...pick,
          currentPrice: currentPrice.toFixed(2),
          returnPercent: returnPct,
          riskReward: rr,
          changePercent: latestPrice?.changePercent ?? null,
        };
      }));
      return picksWithPrices;
    } catch (error) {
      console.error("[drPicks.list] Error:", error);
      throw error;
    }
  }),

  /**
   * Get DR pick by ID with calculated metrics
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const pick = await db.getDrPickById(input.id);
        if (!pick) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `DR pick with ID ${input.id} not found`,
          });
        }

        // Get latest price
        const latestPrice = await db.getLatestPriceSnapshot(pick.symbol);
        const currentPrice = latestPrice ? parseFloat(latestPrice.price) : parseFloat(pick.entryPrice);

        // Calculate metrics
        const metrics = calculationService.calculateMetrics(
          currentPrice,
          parseFloat(pick.entryPrice),
          parseFloat(pick.tp1),
          parseFloat(pick.tp2),
          parseFloat(pick.sl),
          pick.isActive === 1,
          pick.closedAt
        );

        return {
          ...pick,
          currentPrice,
          metrics,
        };
      } catch (error) {
        console.error("[drPicks.getById] Error:", error);
        throw error;
      }
    }),

  /**
   * Create a new DR pick
   */
  create: protectedProcedure
    .input(CreateDrPickInput)
    .mutation(async ({ input }) => {
      try {
        // Server-side duplicate protection: reject if active pick with same symbol exists
        const existing = await db.getDrPickBySymbol(input.symbol);
        if (existing && existing.isActive === 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${input.symbol} มีอยู่ใน DR Picks แล้ว`,
          });
        }
        const result = await db.createDrPick({
          ...input,
          status: "Waiting",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create initial event
        const pick = await db.getDrPickBySymbol(input.symbol);
        if (pick) {
          await db.createPickEvent({
            pickId: pick.id,
            eventType: "CREATED",
            note: `DR pick created: ${input.symbol}`,
            createdAt: new Date(),
          });
        }

        return result;
      } catch (error) {
        console.error("[drPicks.create] Error:", error);
        throw error;
      }
    }),

  /**
   * Update a DR pick
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: UpdateDrPickInput,
      })
    )
    .mutation(async ({ input }) => {
      try {
        const pick = await db.getDrPickById(input.id);
        if (!pick) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `DR pick with ID ${input.id} not found`,
          });
        }

        // Update the pick
        await db.updateDrPick(input.id, {
          ...input.data,
          updatedAt: new Date(),
        });

        // Create event for significant changes
        const changes: string[] = [];
        if (input.data.entryPrice && input.data.entryPrice !== pick.entryPrice) {
          changes.push(`Entry price changed from ${pick.entryPrice} to ${input.data.entryPrice}`);
        }
        if (input.data.tp1 && input.data.tp1 !== pick.tp1) {
          changes.push(`TP1 changed from ${pick.tp1} to ${input.data.tp1}`);
        }
        if (input.data.tp2 && input.data.tp2 !== pick.tp2) {
          changes.push(`TP2 changed from ${pick.tp2} to ${input.data.tp2}`);
        }
        if (input.data.sl && input.data.sl !== pick.sl) {
          changes.push(`SL changed from ${pick.sl} to ${input.data.sl}`);
        }
        if (input.data.note && input.data.note !== pick.note) {
          changes.push(`Note updated: ${input.data.note}`);
        }

        if (changes.length > 0) {
          await db.createPickEvent({
            pickId: input.id,
            eventType: "UPDATED",
            oldValue: JSON.stringify({
              entryPrice: pick.entryPrice,
              tp1: pick.tp1,
              tp2: pick.tp2,
              sl: pick.sl,
            }),
            newValue: JSON.stringify({
              entryPrice: input.data.entryPrice || pick.entryPrice,
              tp1: input.data.tp1 || pick.tp1,
              tp2: input.data.tp2 || pick.tp2,
              sl: input.data.sl || pick.sl,
            }),
            note: changes.join("; "),
            createdAt: new Date(),
          });
        }

        return { success: true };
      } catch (error) {
        console.error("[drPicks.update] Error:", error);
        throw error;
      }
    }),

  /**
   * Delete a DR pick
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const pick = await db.getDrPickById(input.id);
        if (!pick) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `DR pick with ID ${input.id} not found`,
          });
        }
        await db.deleteDrPick(input.id);
        return { success: true };
      } catch (error) {
        console.error("[drPicks.delete] Error:", error);
        throw error;
      }
    }),

  /**
   * Get alerts (picks that hit TP/SL or near TP/SL)
   */
  getAlerts: publicProcedure.query(async () => {
    try {
      const picks = await db.getAllDrPicks();
      const alerts = [];

      for (const pick of picks) {
        const latestPrice = await db.getLatestPriceSnapshot(pick.symbol);
        const currentPrice = latestPrice ? parseFloat(latestPrice.price) : parseFloat(pick.entryPrice);

        const metrics = calculationService.calculateMetrics(
          currentPrice,
          parseFloat(pick.entryPrice),
          parseFloat(pick.tp1),
          parseFloat(pick.tp2),
          parseFloat(pick.sl),
          pick.isActive === 1,
          pick.closedAt
        );

        // Only include alerts for active picks with significant status
        if (
          pick.isActive === 1 &&
          ["Hit TP1", "Hit TP2", "Hit SL", "Near TP", "Near SL"].includes(metrics.status)
        ) {
          alerts.push({
            pickId: pick.id,
            symbol: pick.symbol,
            name: pick.name,
            status: metrics.status,
            currentPrice,
            entryPrice: parseFloat(pick.entryPrice),
            returnPercent: metrics.returnPercent,
            message: generateAlertMessage(pick, metrics, currentPrice),
          });
        }
      }

      return alerts.sort((a, b) => new Date(b.pickId).getTime() - new Date(a.pickId).getTime());
    } catch (error) {
      console.error("[drPicks.getAlerts] Error:", error);
      throw error;
    }
  }),

  /**
   * Refresh prices for all picks
   */
  refreshPrices: publicProcedure.mutation(async () => {
    try {
      const picks = await db.getAllDrPicks();
      const results = [];

      for (const pick of picks) {
        try {
          const priceData = await marketDataService.fetchPriceData(pick.symbol);

          // Save price snapshot
          await db.createPriceSnapshot({
            symbol: pick.symbol,
            price: priceData.price.toString(),
            changePercent: priceData.changePercent.toString(),
            volume: priceData.volume,
            source: priceData.source,
            recordedAt: new Date(),
          });

          // Calculate new status
          const metrics = calculationService.calculateMetrics(
            priceData.price,
            parseFloat(pick.entryPrice),
            parseFloat(pick.tp1),
            parseFloat(pick.tp2),
            parseFloat(pick.sl),
            pick.isActive === 1,
            pick.closedAt
          );

          // Update status if changed
          if (metrics.status !== pick.status) {
            await db.updateDrPick(pick.id, {
              status: metrics.status,
              updatedAt: new Date(),
            });

            // Create event for status change
            await db.createPickEvent({
              pickId: pick.id,
              eventType: "STATUS_CHANGED",
              oldValue: pick.status,
              newValue: metrics.status,
              note: `Status changed to ${metrics.status}`,
              createdAt: new Date(),
            });
          }

          results.push({
            symbol: pick.symbol,
            price: priceData.price,
            status: metrics.status,
            success: true,
          });
        } catch (error) {
          console.error(`[drPicks.refreshPrices] Error for ${pick.symbol}:`, error);
          results.push({
            symbol: pick.symbol,
            success: false,
            error: String(error),
          });
        }
      }

      return results;
    } catch (error) {
      console.error("[drPicks.refreshPrices] Error:", error);
      throw error;
    }
  }),

  /**
   * Get performance metrics
   */
  getPerformance: publicProcedure.query(async () => {
    try {
      const picks = await db.getAllDrPicks();
      const picksWithMetrics = [];

      for (const pick of picks) {
        const latestPrice = await db.getLatestPriceSnapshot(pick.symbol);
        const currentPrice = latestPrice ? parseFloat(latestPrice.price) : parseFloat(pick.entryPrice);

        picksWithMetrics.push({
          currentPrice,
          entryPrice: parseFloat(pick.entryPrice),
          tp1: parseFloat(pick.tp1),
          tp2: parseFloat(pick.tp2),
          sl: parseFloat(pick.sl),
          isActive: pick.isActive === 1,
          closedAt: pick.closedAt,
          status: pick.status,
        });
      }

      const performance = calculationService.calculatePerformanceMetrics(picksWithMetrics);
      return performance;
    } catch (error) {
      console.error("[drPicks.getPerformance] Error:", error);
      throw error;
    }
  }),
});

/**
 * Helper function to generate alert messages
 */
function generateAlertMessage(
  pick: any,
  metrics: any,
  currentPrice: number
): string {
  const returnPercent = metrics.returnPercent.toFixed(2);

  switch (metrics.status) {
    case "Hit TP2":
      return `${pick.symbol} ถึง TP2 แล้ว! ราคาเข้า ${pick.entryPrice} ราคาปัจจุบัน ${currentPrice.toFixed(2)} กำไร +${returnPercent}%`;
    case "Hit TP1":
      return `${pick.symbol} ถึง TP1 แล้ว! ราคาเข้า ${pick.entryPrice} ราคาปัจจุบัน ${currentPrice.toFixed(2)} กำไร +${returnPercent}%`;
    case "Hit SL":
      return `${pick.symbol} ถึง SL แล้ว! ราคาเข้า ${pick.entryPrice} ราคาปัจจุบัน ${currentPrice.toFixed(2)} ขาดทุน ${returnPercent}%`;
    case "Near TP":
      return `${pick.symbol} ใกล้ TP! ราคาปัจจุบัน ${currentPrice.toFixed(2)} กำไร ${returnPercent}%`;
    case "Near SL":
      return `${pick.symbol} ใกล้ SL! ราคาปัจจุบัน ${currentPrice.toFixed(2)} ขาดทุน ${returnPercent}%`;
    default:
      return `${pick.symbol} อัปเดต: ${metrics.status}`;
  }
}
