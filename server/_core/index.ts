import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { setupTelegramWebhook } from "./telegramWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
// Conditional import for vite (dev-only)
import { sdk } from "./sdk";

import { notifyOwner } from "./notification";
import { sendTelegramAlert } from "./telegramWebhook";
import { getAllActiveDailyPicks, updateDailyPick, createPriceHistory } from "../db";
import { getDRPrice } from "../routers/algoEq";
import { scanDR80, DR80ScanResult } from "../services/dr80ScannerService";
import { sendTelegramMessage, formatDR80ScanMessage } from "../services/telegramService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map(origin => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin?.replace(/\/+$/, "");
    const isAllowedOrigin =
      origin &&
      (allowedOrigins.includes(origin) || (!process.env.NODE_ENV || process.env.NODE_ENV === "development"));

    if (isAllowedOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  setupTelegramWebhook(app);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "dr-strategy-tracker-api",
      timestamp: new Date().toISOString(),
    });
  });

  // Scheduled task handlers
  app.post("/api/scheduled/generateDailyPicks", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      // Call the tRPC procedure to generate daily picks
      // This would be called by the scheduled task
      await notifyOwner({
        title: "Daily Picks Generated",
        content: "AI has generated today's DR stock recommendations",
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("[Scheduled] Error generating daily picks:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/scheduled/checkPrices", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      const checkTime = (req.body?.checkTime || "10:50") as "09:00" | "10:50" | "14:30";
      const ownerId = user.id;
      
      if (!ownerId) {
        return res.status(400).json({ error: "No owner ID" });
      }

      const activePicks = await getAllActiveDailyPicks(ownerId);
      
      if (activePicks.length === 0) {
        await notifyOwner({
          title: `Price Check at ${checkTime}`,
          content: `No active picks to check`,
        });
        return res.json({ ok: true, checked: 0 });
      }

      let alertsSent = 0;
      const alerts = [];

      for (const pick of activePicks) {
        try {
          const priceData = await getDRPrice(pick.ticker);
          
          if (!priceData) {
            alerts.push(`${pick.ticker}: Price fetch failed`);
            continue;
          }

          const currentPrice = priceData.price;
          const entry = parseFloat(pick.entryPrice);
          const tp = parseFloat(pick.takeProfit);
          const sl = parseFloat(pick.stopLoss);
          const pnl = (currentPrice - entry).toFixed(2);
          const pnlPercent = (((currentPrice - entry) / entry) * 100).toFixed(2);

          let hitTP = 0;
          let hitSL = 0;
          let newStatus = pick.status;
          let alertMessage = "";

          if (currentPrice >= tp && pick.status !== "tp_hit") {
            hitTP = 1;
            newStatus = "tp_hit";
            alertMessage = `🎯 <b>${pick.ticker}</b> ถึง TP ฿${tp.toFixed(2)} แล้ว!\nราคาปัจจุบัน: ฿${currentPrice.toFixed(2)}\nกำไร: ฿${pnl} (+${pnlPercent}%)`;
          } else if (currentPrice <= sl && pick.status !== "sl_hit") {
            hitSL = 1;
            newStatus = "sl_hit";
            alertMessage = `🛑 <b>${pick.ticker}</b> ถึง SL ฿${sl.toFixed(2)} แล้ว!\nราคาปัจจุบัน: ฿${currentPrice.toFixed(2)}\nขาดทุน: ฿${pnl} (${pnlPercent}%)`;
          } else if (pick.status === "active") {
            const direction = currentPrice > entry ? "↑" : currentPrice < entry ? "↓" : "→";
            alertMessage = `${direction} <b>${pick.ticker}</b>: ฿${currentPrice.toFixed(2)} (${pnlPercent}%)\nEntry: ฿${entry.toFixed(2)} | TP: ฿${tp.toFixed(2)} | SL: ฿${sl.toFixed(2)}`;
          }

          await createPriceHistory({
            dailyPickId: pick.id,
            price: currentPrice.toString(),
            priceUSD: priceData.price.toString(),
            pnl,
            pnlPercent,
            checkTime,
            hitTP,
            hitSL,
            telegramSent: 0,
          });

          if (newStatus !== pick.status) {
            await updateDailyPick(pick.id, { status: newStatus });
          }

          if (alertMessage && pick.telegramChatId) {
            const sent = await sendTelegramAlert(pick.telegramChatId, alertMessage);
            if (sent) {
              alertsSent++;
              alerts.push(`${pick.ticker}: ✓`);
            }
          } else if (alertMessage) {
            alerts.push(`${pick.ticker}: No chat ID`);
          }
        } catch (error) {
          console.error(`[Scheduled] Error checking price for ${pick.ticker}:`, error);
          alerts.push(`${pick.ticker}: Error`);
        }
      }

      await notifyOwner({
        title: `Price Check at ${checkTime}`,
        content: `Checked ${activePicks.length} picks, sent ${alertsSent} alerts\n${alerts.join("\n")}`,
      });

      res.json({ ok: true, checked: activePicks.length, alertsSent });
    } catch (error) {
      console.error("[Scheduled] Error checking prices:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/scheduled/archiveOldPicks", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      // Archive picks older than 7 days
      await notifyOwner({
        title: "Daily Picks Archived",
        content: "Old DR stock picks (>7 days) have been archived",
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("[Scheduled] Error archiving picks:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DR80 Auto-scan scheduled endpoint (Heartbeat cron - runs daily at 08:30 BKK)
  app.post("/api/scheduled/dr80-scan", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }

      console.log("[Scheduled] DR80 auto-scan starting...");
      const scanDate = new Date().toISOString().split("T")[0];

      // Run the DR80 scanner
      const scanResult = await scanDR80();
      const topPicks: DR80ScanResult[] = scanResult.slice(0, 2);
      const totalScanned = scanResult.length;

      // Format and send Telegram message
      const message = formatDR80ScanMessage(topPicks, scanDate, totalScanned);
      const sent = await sendTelegramMessage(message);

      console.log(`[Scheduled] DR80 scan complete: ${topPicks.length} picks, Telegram: ${sent ? "sent" : "failed"}`);

      // Also notify owner via Manus notification
      await notifyOwner({
        title: `DR80 Scanner: ${topPicks.length > 0 ? topPicks.map((p: DR80ScanResult) => p.symbol).join(", ") : "ไม่มีหุ้นผ่านเกณฑ์"}`,
        content: topPicks.length > 0
          ? `คัดได้ ${topPicks.length} ตัว: ${topPicks.map((p: DR80ScanResult) => `${p.symbol} (${p.totalScore}/16)`).join(", ")}`
          : "วันนี้ไม่มีหุ้น DR80 ที่ผ่านเกณฑ์",
      }).catch(() => {}); // non-critical

      res.json({
        ok: true,
        picks: topPicks.length,
        symbols: topPicks.map((p: DR80ScanResult) => p.symbol),
        telegramSent: sent,
        scannedCount: totalScanned,
      });
    } catch (error) {
      console.error("[Scheduled] DR80 scan error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        context: { url: "/api/scheduled/dr80-scan", taskUid: "unknown" },
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Seed DR picks and price snapshots data on server start
    import("../db")
      .then(async db => {
        try {
          await db.seedDrPicks();
          await db.seedDrPriceSnapshots();
        } catch (error) {
          console.warn("[Database] Skipping seed data:", error instanceof Error ? error.message : error);
        }
      })
      .catch(error => {
        console.warn("[Database] Failed to load seed module:", error);
      });
  });
}

startServer().catch(console.error);
