import { describe, it, expect } from "vitest";

describe("Telegram Bot Token Validation", () => {
  it("should validate Telegram Bot Token format", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      console.warn("⚠️ TELEGRAM_BOT_TOKEN not set, skipping validation");
      expect(true).toBe(true);
      return;
    }

    // Telegram Bot Token format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    expect(token).toMatch(tokenRegex);

    // Test bot API connectivity
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();

      if (data.ok) {
        console.log(`✅ Telegram Bot verified: ${data.result.username}`);
        expect(data.ok).toBe(true);
        expect(data.result.is_bot).toBe(true);
      } else {
        console.error("❌ Telegram Bot Token invalid:", data.description);
        expect(data.ok).toBe(true); // Force fail
      }
    } catch (error) {
      console.error("❌ Failed to connect to Telegram API:", error);
      throw error;
    }
  });
});
