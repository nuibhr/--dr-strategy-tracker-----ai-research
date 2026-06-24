import { int, mysqlTable, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Portfolio Tracking Tables
export const portfolios = mysqlTable("portfolios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;

// DR Stock Positions
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  portfolioId: int("portfolioId").notNull(),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  drName: varchar("drName", { length: 100 }).notNull(),
  companyName: text("companyName"),
  entryPrice: varchar("entryPrice", { length: 50 }).notNull(), // Store as string to preserve precision
  entryPriceUSD: varchar("entryPriceUSD", { length: 50 }),
  stopLoss: varchar("stopLoss", { length: 50 }).notNull(),
  takeProfit: varchar("takeProfit", { length: 50 }).notNull(),
  currentPrice: varchar("currentPrice", { length: 50 }),
  currentPriceUSD: varchar("currentPriceUSD", { length: 50 }),
  quantity: varchar("quantity", { length: 50 }).default("1"),
  status: mysqlEnum("status", ["open", "closed", "tp_hit", "sl_hit"]).default("open").notNull(),
  pnl: varchar("pnl", { length: 50 }), // Profit/Loss
  pnlPercent: varchar("pnlPercent", { length: 50 }),
  news: text("news"),
  outlook: text("outlook"),
  support: varchar("support", { length: 50 }),
  resistance: varchar("resistance", { length: 50 }),
  ratio: varchar("ratio", { length: 20 }).default("1"),
  enteredAt: timestamp("enteredAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// Alert Settings
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  positionId: int("positionId").notNull(),
  type: mysqlEnum("type", ["tp_hit", "sl_hit", "price_alert"]).notNull(),
  targetPrice: varchar("targetPrice", { length: 50 }).notNull(),
  triggered: int("triggered").default(0).notNull(), // 0 = false, 1 = true
  triggeredAt: timestamp("triggeredAt"),
  telegramNotified: int("telegramNotified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// Telegram Settings
export const telegramSettings = mysqlTable("telegramSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  chatId: varchar("chatId", { length: 100 }).notNull(),
  botToken: text("botToken").notNull(),
  enabled: int("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramSettings = typeof telegramSettings.$inferSelect;
export type InsertTelegramSettings = typeof telegramSettings.$inferInsert;

// Google Sheets Sync Log
export const sheetsSync = mysqlTable("sheetsSync", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sheetId: varchar("sheetId", { length: 200 }).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  syncStatus: mysqlEnum("syncStatus", ["pending", "syncing", "success", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SheetsSync = typeof sheetsSync.$inferSelect;
export type InsertSheetsSync = typeof sheetsSync.$inferInsert;

// Daily DR Picks (AI-generated recommendations)
export const dailyPicks = mysqlTable("dailyPicks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  drName: varchar("drName", { length: 100 }).notNull(),
  companyName: text("companyName"),
  entryPrice: varchar("entryPrice", { length: 50 }).notNull(),
  entryPriceUSD: varchar("entryPriceUSD", { length: 50 }),
  stopLoss: varchar("stopLoss", { length: 50 }).notNull(),
  takeProfit: varchar("takeProfit", { length: 50 }).notNull(),
  currentPrice: varchar("currentPrice", { length: 50 }),
  currentPriceUSD: varchar("currentPriceUSD", { length: 50 }),
  news: text("news"),
  outlook: text("outlook"),
  support: varchar("support", { length: 50 }),
  resistance: varchar("resistance", { length: 50 }),
  ratio: varchar("ratio", { length: 20 }).default("1"),
  analysis: text("analysis"), // AI analysis reasoning
  telegramChatId: varchar("telegramChatId", { length: 100 }),
  status: mysqlEnum("status", ["active", "archived", "tp_hit", "sl_hit"]).default("active").notNull(),
  pickedAt: timestamp("pickedAt").defaultNow().notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyPick = typeof dailyPicks.$inferSelect;
export type InsertDailyPick = typeof dailyPicks.$inferInsert;

// Price History for tracking changes
export const priceHistory = mysqlTable("priceHistory", {
  id: int("id").autoincrement().primaryKey(),
  dailyPickId: int("dailyPickId").notNull(),
  price: varchar("price", { length: 50 }).notNull(),
  priceUSD: varchar("priceUSD", { length: 50 }),
  pnl: varchar("pnl", { length: 50 }),
  pnlPercent: varchar("pnlPercent", { length: 50 }),
  checkTime: mysqlEnum("checkTime", ["09:00", "10:50", "14:30"]).notNull(),
  hitTP: int("hitTP").default(0).notNull(),
  hitSL: int("hitSL").default(0).notNull(),
  telegramSent: int("telegramSent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

// DR Strategy Tracker Tables
// Main DR picks table for dashboard tracking
export const drPicks = mysqlTable("drPicks", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 50 }).notNull(), // e.g., NVDA80, AAPL80
  name: varchar("name", { length: 100 }).notNull(), // e.g., Nvidia, Apple
  market: varchar("market", { length: 50 }).notNull(), // e.g., US, TH
  entryDate: timestamp("entryDate").notNull(),
  entryPrice: varchar("entryPrice", { length: 50 }).notNull(),
  tp1: varchar("tp1", { length: 50 }).notNull(),
  tp2: varchar("tp2", { length: 50 }).notNull(),
  sl: varchar("sl", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["Hit TP1", "Hit TP2", "Hit SL", "Near TP", "Near SL", "Waiting", "Closed", "Watchlist"]).default("Waiting").notNull(),
  reason: text("reason"), // Why we recommended this
  note: text("note"), // Additional notes
  isActive: int("isActive").default(1).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type DrPick = typeof drPicks.$inferSelect;
export type InsertDrPick = typeof drPicks.$inferInsert;

// Price snapshots for tracking price history
export const drPriceSnapshots = mysqlTable("drPriceSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 50 }).notNull(),
  price: varchar("price", { length: 50 }).notNull(),
  changePercent: varchar("changePercent", { length: 50 }),
  volume: int("volume"),
  source: varchar("source", { length: 50 }).default("mock").notNull(), // e.g., ALGO_EQ, Mock
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type DrPriceSnapshot = typeof drPriceSnapshots.$inferSelect;
export type InsertDrPriceSnapshot = typeof drPriceSnapshots.$inferInsert;

// Pick events for tracking changes and updates
export const drPickEvents = mysqlTable("drPickEvents", {
  id: int("id").autoincrement().primaryKey(),
  pickId: int("pickId").notNull(),
  eventType: varchar("eventType", { length: 50 }).notNull(), // e.g., SL_MOVED, TP_HIT, NOTE_ADDED
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrPickEvent = typeof drPickEvents.$inferSelect;
export type InsertDrPickEvent = typeof drPickEvents.$inferInsert;

// Relations
export const dailyPicksRelations = relations(dailyPicks, ({ many }) => ({
  priceHistory: many(priceHistory),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  dailyPick: one(dailyPicks, {
    fields: [priceHistory.dailyPickId],
    references: [dailyPicks.id],
  }),
}));

export const drPicksRelations = relations(drPicks, ({ many }) => ({
  events: many(drPickEvents),
}));

export const drPickEventsRelations = relations(drPickEvents, ({ one }) => ({
  pick: one(drPicks, {
    fields: [drPickEvents.pickId],
    references: [drPicks.id],
  }),
}));

// drPriceSnapshots has no relations to other tables