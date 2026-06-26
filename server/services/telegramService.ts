/**
 * Telegram Notification Service
 * Sends DR80 scan results to Telegram via Bot API
 */
import { DR80ScanResult } from "./dr80ScannerService";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Send a message to Telegram
 */
export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "Markdown" | "MarkdownV2" = "HTML"
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Telegram] Bot token or chat ID not configured");
    return false;
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      }
    );

    const data = (await response.json()) as TelegramResponse;
    if (!data.ok) {
      console.error("[Telegram] API error:", data.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return false;
  }
}

/**
 * Format DR80 scan results into a Telegram message
 * Uses DR80ScanResult from dr80ScannerService
 */
export function formatDR80ScanMessage(
  picks: DR80ScanResult[],
  scanDate: string,
  totalScanned: number
): string {
  const dateStr = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });

  if (picks.length === 0) {
    return (
      `🔍 <b>DR80 Daily Scanner</b>\n` +
      `📅 ${dateStr}\n\n` +
      `❌ วันนี้ไม่มีหุ้น DR80 ที่ผ่านเกณฑ์\n` +
      `(สแกนทั้งหมด ${totalScanned} ตัว)\n\n` +
      `💡 ตลาดอาจยังไม่เหมาะสมสำหรับการเข้าซื้อ รอสัญญาณที่ชัดเจนกว่านี้ครับ`
    );
  }

  // Max possible score: EMA(3×2=6) + RSI(3) + MACD(3) + Camarilla(4) = 16
  const MAX_SCORE = 16;

  let msg =
    `🎯 <b>DR80 Daily Scanner — หนุ่มนักออม</b>\n` +
    `📅 ${dateStr}\n` +
    `🔍 สแกนแล้ว ${totalScanned} ตัว | คัดได้ ${picks.length} ตัว\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n`;

  picks.forEach((pick, idx) => {
    const medal = idx === 0 ? "🥇" : "🥈";
    const tp1Pct = (
      ((pick.tp1 - pick.entry) / pick.entry) * 100
    ).toFixed(1);
    const tp2Pct = (
      ((pick.tp2 - pick.entry) / pick.entry) * 100
    ).toFixed(1);
    const slPct = (
      ((pick.sl - pick.entry) / pick.entry) * 100
    ).toFixed(1);

    // Signal summary
    const emaStatus = pick.emaScore >= 2 ? "✅" : pick.emaScore >= 1 ? "⚠️" : "❌";
    const rsiStatus = pick.rsiScore >= 2 ? "✅" : pick.rsiScore >= 1 ? "⚠️" : "❌";
    const macdStatus = pick.macdScore >= 2 ? "✅" : pick.macdScore >= 1 ? "⚠️" : "❌";
    const camStatus = pick.camScore >= 2 ? "✅" : pick.camScore >= 1 ? "⚠️" : "❌";

    msg +=
      `${medal} <b>${pick.symbol}</b>\n` +
      `💰 ราคาปัจจุบัน: <b>${pick.currentPrice.toFixed(2)} ฿</b> (${pick.changePct >= 0 ? "+" : ""}${pick.changePct.toFixed(2)}%)\n` +
      `📊 คะแนน: ${pick.totalScore}/${MAX_SCORE}\n\n` +
      `📌 <b>แผนเทรด</b>\n` +
      `  🟢 Entry: <b>${pick.entry.toFixed(2)} ฿</b>\n` +
      `  🎯 TP1: <b>${pick.tp1.toFixed(2)} ฿</b> (+${tp1Pct}%)\n` +
      `  🎯 TP2: <b>${pick.tp2.toFixed(2)} ฿</b> (+${tp2Pct}%)\n` +
      `  🔴 SL: <b>${pick.sl.toFixed(2)} ฿</b> (${slPct}%)\n` +
      `  ⚖️ R/R: ${pick.riskReward.toFixed(2)}\n\n` +
      `📈 <b>สัญญาณ</b>\n` +
      `  ${emaStatus} EMA 25/50/75: ${pick.emaScore}/3\n` +
      `  ${rsiStatus} RSI(14): ${pick.rsiScore}/3\n` +
      `  ${macdStatus} MACD: ${pick.macdScore}/3\n` +
      `  ${camStatus} Camarilla: ${pick.camScore}/4\n\n` +
      `💬 ${pick.reason}\n`;

    if (idx < picks.length - 1) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
  });

  msg +=
    `\n━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <i>ข้อมูลนี้เป็นการวิเคราะห์เชิงเทคนิคเท่านั้น ไม่ใช่คำแนะนำการลงทุน</i>\n` +
    `🤖 <i>DR Strategy Tracker — หนุ่มนักออม AI Research</i>`;

  return msg;
}
