
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, portfolios, positions, alerts, telegramSettings, sheetsSync, dailyPicks, priceHistory, InsertPortfolio, InsertPosition, InsertAlert, InsertTelegramSettings, InsertDailyPick, InsertPriceHistory, InsertDrPick, InsertDrPriceSnapshot, drPicks, drPriceSnapshots, drPickEvents } from "../drizzle/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Portfolio queries
export async function createPortfolio(userId: number, portfolio: Omit<InsertPortfolio, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(portfolios).values({
    ...portfolio,
    userId,
  });
  return result;
}

export async function getUserPortfolios(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(portfolios).where(eq(portfolios.userId, userId));
}

// Position queries
export async function createPosition(position: InsertPosition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(positions).values(position);
}

export async function getPortfolioPositions(portfolioId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(positions).where(eq(positions.portfolioId, portfolioId));
}

export async function updatePosition(positionId: number, updates: Partial<InsertPosition>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(positions).set(updates).where(eq(positions.id, positionId));
}

export async function getPositionById(positionId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(positions).where(eq(positions.id, positionId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Alert queries
export async function createAlert(alert: InsertAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(alerts).values(alert);
}

export async function getPositionAlerts(positionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(alerts).where(eq(alerts.positionId, positionId));
}

export async function updateAlert(alertId: number, updates: Partial<InsertAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(alerts).set(updates).where(eq(alerts.id, alertId));
}

// Telegram settings queries
export async function getTelegramSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(telegramSettings).where(eq(telegramSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertTelegramSettings(userId: number, settings: Omit<InsertTelegramSettings, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getTelegramSettings(userId);
  if (existing) {
    return db.update(telegramSettings).set(settings).where(eq(telegramSettings.userId, userId));
  } else {
    return db.insert(telegramSettings).values({
      ...settings,
      userId,
    });
  }
}

// Sheets sync queries
export async function getSheetsSyncStatus(userId: number, sheetId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(sheetsSync).where(
    and(eq(sheetsSync.userId, userId), eq(sheetsSync.sheetId, sheetId))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSheetsSyncStatus(userId: number, sheetId: string, status: string, errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSheetsSyncStatus(userId, sheetId);
  if (existing) {
    return db.update(sheetsSync).set({
      syncStatus: status as any,
      errorMessage,
      lastSyncAt: new Date(),
    }).where(and(eq(sheetsSync.userId, userId), eq(sheetsSync.sheetId, sheetId)));
  } else {
    return db.insert(sheetsSync).values({
      userId,
      sheetId,
      syncStatus: status as any,
      errorMessage,
      lastSyncAt: new Date(),
    });
  }
}

// Daily Picks queries
export async function createDailyPick(pick: InsertDailyPick) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(dailyPicks).values(pick);
}

export async function getTodaysDailyPicks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return db.select()
    .from(dailyPicks)
    .where(and(
      eq(dailyPicks.userId, userId),
      eq(dailyPicks.status, "active"),
      gte(dailyPicks.pickedAt, today)
    ));
}

export async function getAllActiveDailyPicks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(dailyPicks)
    .where(and(
      eq(dailyPicks.userId, userId),
      eq(dailyPicks.status, "active")
    ));
}

export async function updateDailyPick(pickId: number, updates: Partial<InsertDailyPick>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(dailyPicks).set(updates).where(eq(dailyPicks.id, pickId));
}

export async function archiveDailyPick(pickId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(dailyPicks)
    .set({ status: "archived", archivedAt: new Date() })
    .where(eq(dailyPicks.id, pickId));
}

// Price History queries
export async function createPriceHistory(history: InsertPriceHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(priceHistory).values(history);
}

export async function getPriceHistory(dailyPickId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(priceHistory)
    .where(eq(priceHistory.dailyPickId, dailyPickId))
    .orderBy(desc(priceHistory.createdAt));
}

export async function getLatestPriceHistory(dailyPickId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select()
    .from(priceHistory)
    .where(eq(priceHistory.dailyPickId, dailyPickId))
    .orderBy(desc(priceHistory.createdAt))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function archiveOldDailyPicks(userId: number, daysOld: number = 7) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return db.update(dailyPicks)
    .set({ status: "archived", archivedAt: new Date() })
    .where(and(
      eq(dailyPicks.userId, userId),
      eq(dailyPicks.status, "active"),
      lt(dailyPicks.pickedAt, cutoffDate)
    ));
}

export async function get7DayPickHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return db.select()
    .from(dailyPicks)
    .where(and(
      eq(dailyPicks.userId, userId),
      gte(dailyPicks.pickedAt, sevenDaysAgo)
    ))
    .orderBy(desc(dailyPicks.pickedAt));
}

// Import DR types at top of file
// import { drPicks, drPriceSnapshots, drPickEvents, InsertDrPick, InsertDrPriceSnapshot, InsertDrPickEvent } from "../drizzle/schema";

// DR Picks queries
export async function createDrPick(pick: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Import drPicks from schema
  const { drPicks } = await import("../drizzle/schema");
  const result = await db.insert(drPicks).values(pick);
  return result;
}

export async function getAllDrPicks() {
  const db = await getDb();
  if (!db) return [];
  
  const { drPicks } = await import("../drizzle/schema");
  return db.select().from(drPicks).orderBy(desc(drPicks.createdAt));
}

export async function getActiveDrPicks() {
  const db = await getDb();
  if (!db) return [];
  
  const { drPicks } = await import("../drizzle/schema");
  return db.select()
    .from(drPicks)
    .where(and(
      eq(drPicks.isActive, 1),
      eq(drPicks.status, "Waiting")
    ))
    .orderBy(desc(drPicks.createdAt));
}

export async function getDrPickById(pickId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { drPicks } = await import("../drizzle/schema");
  const result = await db.select().from(drPicks).where(eq(drPicks.id, pickId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDrPickBySymbol(symbol: string) {
  const db = await getDb();
  if (!db) return null;
  
  const { drPicks } = await import("../drizzle/schema");
  const result = await db.select().from(drPicks).where(eq(drPicks.symbol, symbol)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDrPick(pickId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { drPicks } = await import("../drizzle/schema");
  return db.update(drPicks).set(updates).where(eq(drPicks.id, pickId));
}

export async function deleteDrPick(pickId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { drPicks } = await import("../drizzle/schema");
  return db.delete(drPicks).where(eq(drPicks.id, pickId));
}

// DR Price Snapshots queries
export async function createPriceSnapshot(snapshot: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { drPriceSnapshots } = await import("../drizzle/schema");
  return db.insert(drPriceSnapshots).values(snapshot);
}

export async function getLatestPriceSnapshot(symbol: string) {
  const db = await getDb();
  if (!db) return null;
  
  const { drPriceSnapshots } = await import("../drizzle/schema");
  const result = await db.select()
    .from(drPriceSnapshots)
    .where(eq(drPriceSnapshots.symbol, symbol))
    .orderBy(desc(drPriceSnapshots.recordedAt))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getPriceSnapshotHistory(symbol: string, hoursBack: number = 24) {
  const db = await getDb();
  if (!db) return [];
  
  const { drPriceSnapshots } = await import("../drizzle/schema");
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
  
  return db.select()
    .from(drPriceSnapshots)
    .where(and(
      eq(drPriceSnapshots.symbol, symbol),
      gte(drPriceSnapshots.recordedAt, cutoffTime)
    ))
    .orderBy(desc(drPriceSnapshots.recordedAt));
}

// DR Pick Events queries
export async function createPickEvent(event: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { drPickEvents } = await import("../drizzle/schema");
  return db.insert(drPickEvents).values(event);
}

export async function getPickEvents(pickId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { drPickEvents } = await import("../drizzle/schema");
  return db.select()
    .from(drPickEvents)
    .where(eq(drPickEvents.pickId, pickId))
    .orderBy(desc(drPickEvents.createdAt));
}

export async function getRecentPickEvents(pickId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const { drPickEvents } = await import("../drizzle/schema");
  return db.select()
    .from(drPickEvents)
    .where(eq(drPickEvents.pickId, pickId))
    .orderBy(desc(drPickEvents.createdAt))
    .limit(limit);
}

// Seed data for DR picks
export async function seedDrPicks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { drPicks } = await import("../drizzle/schema");

  const existingPicks = await db.select().from(drPicks).limit(1);
  if (existingPicks.length > 0) {
    console.log("DR picks already seeded. Skipping.");
    return;
  }

  const picksToSeed: InsertDrPick[] = [
    {
      symbol: "AAPL80",
      name: "Apple DR",
      market: "US",
      entryDate: new Date("2024-06-24T09:00:00Z"),
      entryPrice: "4.20",
      tp1: "4.45",
      tp2: "4.60",
      sl: "4.00",
      status: "Waiting",
      reason: "Strong brand, consistent innovation, good earnings report. iPhone 16 cycle.",
      note: "Monitor for iPhone sales data and AI integration.",
      isActive: 1,
    },
    {
      symbol: "NVDA80",
      name: "Nvidia DR",
      market: "US",
      entryDate: new Date("2024-06-23T09:00:00Z"),
      entryPrice: "6.10",
      tp1: "6.50",
      tp2: "6.80",
      sl: "5.80",
      status: "Hit TP1",
      reason: "Leader in AI and gaming GPUs, Blackwell chip demand surge.",
      note: "Watch for competition in AI chip market.",
      isActive: 1,
    },
    {
      symbol: "TSLA80",
      name: "Tesla DR",
      market: "US",
      entryDate: new Date("2024-06-22T09:00:00Z"),
      entryPrice: "3.80",
      tp1: "4.00",
      tp2: "4.20",
      sl: "3.60",
      status: "Near SL",
      reason: "EV market growth, FSD advancements. Robotaxi catalyst.",
      note: "Volatility due to Elon Musk's tweets. Watch delivery numbers.",
      isActive: 1,
    },
    {
      symbol: "META80",
      name: "Meta Platforms DR",
      market: "US",
      entryDate: new Date("2024-06-24T09:00:00Z"),
      entryPrice: "5.25",
      tp1: "5.60",
      tp2: "5.90",
      sl: "4.90",
      status: "Waiting",
      reason: "Dominant social media presence, AI Llama model advantage.",
      note: "Regulatory scrutiny and competition. Watch ad revenue.",
      isActive: 1,
    },
    {
      symbol: "GOOG80",
      name: "Alphabet DR",
      market: "US",
      entryDate: new Date("2024-06-21T09:00:00Z"),
      entryPrice: "4.28",
      tp1: "4.45",
      tp2: "4.70",
      sl: "4.10",
      status: "Waiting",
      reason: "Strong advertising revenue, AI Gemini leadership.",
      note: "Antitrust concerns. Watch Search market share.",
      isActive: 1,
    },
  ];

  await db.insert(drPicks).values(picksToSeed);
  console.log("DR picks seeded successfully.");
}

// Seed data for DR price snapshots
export async function seedDrPriceSnapshots() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existingSnapshots = await db.select().from(drPriceSnapshots).limit(1);
  if (existingSnapshots.length > 0) {
    console.log("DR price snapshots already seeded. Skipping.");
    return;
  }

  const snapshotsToSeed = [
    { symbol: "AAPL80", price: "4.34", changePercent: "3.33", source: "mock" },
    { symbol: "NVDA80", price: "6.55", changePercent: "7.38", source: "mock" },
    { symbol: "TSLA80", price: "3.62", changePercent: "-4.73", source: "mock" },
    { symbol: "META80", price: "5.52", changePercent: "5.14", source: "mock" },
    { symbol: "GOOG80", price: "4.36", changePercent: "1.87", source: "mock" },
  ] satisfies InsertDrPriceSnapshot[];

  await db.insert(drPriceSnapshots).values(snapshotsToSeed);
  console.log("DR price snapshots seeded successfully.");
}
