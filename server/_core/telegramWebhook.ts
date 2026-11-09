import { Express } from "express";
import { timingSafeEqual } from "node:crypto";
import { sdk } from "./sdk";

/**
 * Telegram Webhook Handler
 * Receives messages from Telegram bot and responds with Chat ID
 */

export function setupTelegramWebhook(app: Express) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn("[Telegram Webhook] Bot token not configured, skipping webhook setup");
    return;
  }

  /**
   * POST /api/telegram/webhook
   * Receives updates from Telegram bot
   */
  app.post("/api/telegram/webhook", async (req, res) => {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected || !/^[A-Za-z0-9_-]{16,256}$/.test(expected)) {
      return res.status(503).json({ ok: false, error: "webhook-not-configured" });
    }
    const supplied = req.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(supplied);
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
      return res.status(403).json({ ok: false, error: "invalid-webhook-secret" });
    }
    try {
      const update = req.body;

      // Handle /start command
      if (update.message?.text === "/start") {
        const chatId = update.message.chat.id;
        const firstName = update.message.from?.first_name || "User";

        // Send Chat ID to user
        const message = `👋 Welcome, ${firstName}!\n\nYour Chat ID is:\n\`${chatId}\`\n\nCopy this and paste it in DR Strategy Tracker Settings → Telegram Alerts`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),
        });

        const data = await response.json();

        if (data.ok) {
          console.log(`[Telegram Webhook] Sent Chat ID to ${firstName} (${chatId})`);
        } else {
          console.error("[Telegram Webhook] Failed to send message:", data.description);
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("[Telegram Webhook] Error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * POST /api/telegram/webhook/set (admin only)
   * Sets the webhook URL for Telegram bot
   */
  app.get("/api/telegram/webhook/set", (_req, res) => {
    res.set("Allow", "POST").status(405).json({ ok: false, error: "use-authenticated-post" });
  });
  app.post("/api/telegram/webhook/set", async (req, res) => {
    let user;
    try { user = await sdk.authenticateRequest(req); }
    catch { return res.status(401).json({ ok: false, error: "authentication-required" }); }
    if (user.role !== "admin") return res.status(403).json({ ok: false, error: "admin-required" });
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret || !/^[A-Za-z0-9_-]{16,256}$/.test(secret) || !process.env.PUBLIC_URL) {
      return res.status(503).json({ ok: false, error: "webhook-not-configured" });
    }
    try {
      const publicUrl = new URL(process.env.PUBLIC_URL);
      if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password) {
        return res.status(400).json({ ok: false, error: "public-url-must-be-https" });
      }
      const webhookUrl = `${publicUrl.origin}/api/telegram/webhook`;

      console.log(`[Telegram Webhook] Setting webhook URL: ${webhookUrl}`);

      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message"],
        }),
      });

      const data = await response.json();

      if (data.ok) {
        console.log("[Telegram Webhook] Webhook set successfully");
        res.json({ ok: true, message: "Webhook set successfully", url: webhookUrl });
      } else {
        console.error("[Telegram Webhook] Failed to set webhook:", data.description);
        res.status(400).json({ ok: false, error: data.description });
      }
    } catch (error) {
      console.error("[Telegram Webhook] Error setting webhook:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  console.log("[Telegram Webhook] Webhook handlers registered");
}


/**
 * Send Telegram alert for DR stock price updates
 */
export async function sendTelegramAlert(
  chatId: string,
  message: string
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !chatId) {
    console.warn("[Telegram Alert] Missing bot token or chat ID");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`[Telegram Alert] Sent to chat ${chatId}`);
      return true;
    } else {
      console.error("[Telegram Alert] Failed to send:", data.description);
      return false;
    }
  } catch (error) {
    console.error("[Telegram Alert] Error sending message:", error);
    return false;
  }
}
