import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { upsertTelegramSettings, getTelegramSettings } from "../db";

/**
 * Telegram Alert Router
 * Sends notifications to Telegram when positions hit TP/SL
 */

export const telegramRouter = router({
  /**
   * Set Telegram Chat ID for alerts
   */
  setChatId: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) throw new Error("Telegram Bot Token not configured");

        // Save to database
        await upsertTelegramSettings(ctx.user.id, {
          chatId: input.chatId,
          botToken: botToken,
          enabled: 1,
        });

        console.log(`[Telegram] Set Chat ID for user ${ctx.user.id}: ${input.chatId}`);

        return {
          success: true,
          message: "✅ Telegram Chat ID saved",
          chatId: input.chatId,
        };
      } catch (error) {
        console.error("[Telegram] Error setting Chat ID:", error);
        throw new Error(`Failed to set Telegram Chat ID: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * Send test notification to Telegram
   */
  sendTestNotification: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) throw new Error("Telegram Bot Token not configured");

        const message = `✅ **DR Strategy Tracker Alert Test**\n\nBot is working correctly!\n\nYou will receive alerts when your positions hit TP or SL.`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: input.chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });

        const data = await response.json();

        if (data.ok) {
          console.log("[Telegram] Test notification sent successfully");
          return {
            success: true,
            message: "✅ Test notification sent to Telegram",
          };
        } else {
          throw new Error(data.description || "Failed to send message");
        }
      } catch (error) {
        console.error("[Telegram] Error sending test notification:", error);
        throw new Error(`Failed to send test notification: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * Send TP alert
   */
  sendTPAlert: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        symbol: z.string(),
        currentPrice: z.number(),
        takeProfit: z.number(),
        quantity: z.number(),
        profit: z.number(),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) throw new Error("Telegram Bot Token not configured");

        const message = `🎉 **TAKE PROFIT HIT!**\n\n📊 Symbol: ${input.symbol}\n💰 Current Price: ฿${input.currentPrice.toFixed(2)}\n🎯 Take Profit: ฿${input.takeProfit.toFixed(2)}\n📈 Quantity: ${input.quantity}\n💵 Profit: ฿${input.profit.toFixed(2)}`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: input.chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });

        const data = await response.json();

        if (data.ok) {
          console.log(`[Telegram] TP alert sent for ${input.symbol}`);
          return { success: true };
        } else {
          throw new Error(data.description);
        }
      } catch (error) {
        console.error("[Telegram] Error sending TP alert:", error);
        throw error;
      }
    }),

  /**
   * Send SL alert
   */
  sendSLAlert: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        symbol: z.string(),
        currentPrice: z.number(),
        stopLoss: z.number(),
        quantity: z.number(),
        loss: z.number(),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) throw new Error("Telegram Bot Token not configured");

        const message = `🛑 **STOP LOSS HIT!**\n\n📊 Symbol: ${input.symbol}\n💰 Current Price: ฿${input.currentPrice.toFixed(2)}\n🛑 Stop Loss: ฿${input.stopLoss.toFixed(2)}\n📈 Quantity: ${input.quantity}\n💸 Loss: ฿${input.loss.toFixed(2)}`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: input.chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });

        const data = await response.json();

        if (data.ok) {
          console.log(`[Telegram] SL alert sent for ${input.symbol}`);
          return { success: true };
        } else {
          throw new Error(data.description);
        }
      } catch (error) {
        console.error("[Telegram] Error sending SL alert:", error);
        throw error;
      }
    }),

  /**
   * Get Telegram settings
   */
  getSettings: protectedProcedure.query(async ({ ctx }: any) => {
    try {
      const settings = await getTelegramSettings(ctx.user.id);
      
      return {
        chatId: settings?.chatId || null,
        isConfigured: !!settings?.chatId,
        enabled: settings?.enabled === 1,
      };
    } catch (error) {
      console.error("[Telegram] Error getting settings:", error);
      throw error;
    }
  }),
});
