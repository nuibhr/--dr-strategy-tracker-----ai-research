import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import type { InsertPosition } from "../../drizzle/schema";
import {
  createPortfolio,
  getUserPortfolios,
  createPosition,
  getPortfolioPositions,
  updatePosition,
  getPositionById,
  createAlert,
  getPositionAlerts,
} from "../db";

export const portfolioRouter = router({
  // Portfolio procedures
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserPortfolios(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createPortfolio(ctx.user.id, input);
    }),

  // Position procedures
  addPosition: protectedProcedure
    .input(
      z.object({
        portfolioId: z.number(),
        ticker: z.string().min(1),
        drName: z.string().min(1),
        companyName: z.string().optional(),
        entryPrice: z.string().min(1),
        entryPriceUSD: z.string().optional(),
        stopLoss: z.string().min(1),
        takeProfit: z.string().min(1),
        currentPrice: z.string().optional(),
        currentPriceUSD: z.string().optional(),
        quantity: z.string().optional(),
        news: z.string().optional(),
        outlook: z.string().optional(),
        support: z.string().optional(),
        resistance: z.string().optional(),
        ratio: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { portfolioId, ...rest } = input;
      return createPosition({
        portfolioId,
        ...rest,
        quantity: rest.quantity || "1",
        ratio: rest.ratio || "1",
      });
    }),

  getPositions: protectedProcedure
    .input(z.object({ portfolioId: z.number() }))
    .query(async ({ input }) => {
      return getPortfolioPositions(input.portfolioId);
    }),

  getPosition: protectedProcedure
    .input(z.object({ positionId: z.number() }))
    .query(async ({ input }) => {
      return getPositionById(input.positionId);
    }),

  updatePosition: protectedProcedure
    .input(
      z.object({
        positionId: z.number(),
        currentPrice: z.string().optional(),
        currentPriceUSD: z.string().optional(),
        status: z.enum(["open", "closed", "tp_hit", "sl_hit"]).optional(),
        pnl: z.string().optional(),
        pnlPercent: z.string().optional(),
        closedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { positionId, ...updates } = input;
      return updatePosition(positionId, updates as Partial<InsertPosition>);
    }),

  // Alert procedures
  getAlerts: protectedProcedure
    .input(z.object({ positionId: z.number() }))
    .query(async ({ input }) => {
      return getPositionAlerts(input.positionId);
    }),

  createAlert: protectedProcedure
    .input(
      z.object({
        positionId: z.number(),
        type: z.enum(["tp_hit", "sl_hit", "price_alert"]),
        targetPrice: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return createAlert({
        positionId: input.positionId,
        type: input.type,
        targetPrice: input.targetPrice,
      });
    }),
});
