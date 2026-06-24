import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createDailyPick,
  getTodaysDailyPicks,
  getAllActiveDailyPicks,
  updateDailyPick,
  archiveDailyPick,
  archiveOldDailyPicks,
  createPriceHistory,
  getPriceHistory,
  getLatestPriceHistory,
  get7DayPickHistory,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

export const dailyPicksRouter = router({
  // Get today's picks
  getTodaysPicks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getTodaysDailyPicks(ctx.user.id);
    } catch (error) {
      console.error("[dailyPicks] Error fetching today's picks:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  // Get all active picks
  getActivePicks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getAllActiveDailyPicks(ctx.user.id);
    } catch (error) {
      console.error("[dailyPicks] Error fetching active picks:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  // Get price history for a pick
  getPriceHistory: protectedProcedure
    .input(z.object({ pickId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getPriceHistory(input.pickId);
      } catch (error) {
        console.error("[dailyPicks] Error fetching price history:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  // Get 7-day pick history
  get7DayHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await get7DayPickHistory(ctx.user.id);
    } catch (error) {
      console.error("[dailyPicks] Error fetching 7-day history:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  // Create daily picks (called by scheduled task)
  createDailyPicksAI: protectedProcedure
    .input(
      z.object({
        stocks: z.array(
          z.object({
            ticker: z.string(),
            drName: z.string(),
            companyName: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const picks = [];

        for (const stock of input.stocks.slice(0, 2)) {
          // Limit to 2 picks per day
          // Call LLM to analyze the stock
          const analysis = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are an expert stock analyst. Analyze the given stock and provide a trading recommendation with entry price, stop loss, take profit, and outlook.",
              },
              {
                role: "user",
                content: `Analyze ${stock.ticker} (${stock.drName}) and provide:
1. Entry price range (in USD)
2. Stop loss level
3. Take profit level
4. Short outlook (1-2 sentences)
5. Key news/catalyst
Return as JSON: {entry, sl, tp, outlook, news}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "stock_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    entry: { type: "string" },
                    sl: { type: "string" },
                    tp: { type: "string" },
                    outlook: { type: "string" },
                    news: { type: "string" },
                  },
                  required: ["entry", "sl", "tp", "outlook", "news"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content =
            typeof analysis.choices[0].message.content === "string"
              ? analysis.choices[0].message.content
              : JSON.stringify(analysis.choices[0].message.content);

          const parsed = JSON.parse(content);

          const pick = await createDailyPick({
            userId: ctx.user.id,
            ticker: stock.ticker,
            drName: stock.drName,
            companyName: stock.companyName,
            entryPrice: parsed.entry,
            stopLoss: parsed.sl,
            takeProfit: parsed.tp,
            outlook: parsed.outlook,
            news: parsed.news,
            analysis: JSON.stringify(parsed),
            status: "active",
          });

          picks.push(pick);
        }

        return picks;
      } catch (error) {
        console.error("[dailyPicks] Error creating AI picks:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  // Update pick price (called by scheduled task)
  updatePickPrice: protectedProcedure
    .input(
      z.object({
        pickId: z.number(),
        currentPrice: z.string(),
        currentPriceUSD: z.string().optional(),
        checkTime: z.enum(["09:00", "10:50", "14:30"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Update the pick's current price
        await updateDailyPick(input.pickId, {
          currentPrice: input.currentPrice,
          currentPriceUSD: input.currentPriceUSD,
        });

        // Get the pick to calculate P&L
        const picks = await getAllActiveDailyPicks(ctx.user.id);
        const pick = picks.find((p) => p.id === input.pickId);

        if (!pick) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Calculate P&L
        const entry = parseFloat(pick.entryPrice);
        const current = parseFloat(input.currentPrice);
        const pnl = (current - entry).toFixed(2);
        const pnlPercent = (((current - entry) / entry) * 100).toFixed(2);

        // Check if TP or SL hit
        const tp = parseFloat(pick.takeProfit);
        const sl = parseFloat(pick.stopLoss);
        let status = pick.status;
        let hitTP = 0;
        let hitSL = 0;

        if (current >= tp) {
          status = "tp_hit";
          hitTP = 1;
        } else if (current <= sl) {
          status = "sl_hit";
          hitSL = 1;
        }

        // Create price history record
        await createPriceHistory({
          dailyPickId: input.pickId,
          price: input.currentPrice,
          priceUSD: input.currentPriceUSD,
          pnl,
          pnlPercent,
          checkTime: input.checkTime,
          hitTP,
          hitSL,
          telegramSent: 0,
        });

        // Update pick status if TP/SL hit
        if (status !== pick.status) {
          await updateDailyPick(input.pickId, { status });
        }

        return {
          pickId: input.pickId,
          pnl,
          pnlPercent,
          hitTP,
          hitSL,
          status,
        };
      } catch (error) {
        console.error("[dailyPicks] Error updating pick price:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  // Archive old picks (called by scheduled task)
  archiveOldPicks: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await archiveOldDailyPicks(ctx.user.id, 7);
      return { success: true };
    } catch (error) {
      console.error("[dailyPicks] Error archiving old picks:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
});
