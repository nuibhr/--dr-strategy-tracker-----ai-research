import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/dr80ScannerService", () => ({
  scanDR80: vi.fn(),
}));

import { integrationsRouter } from "./integrations";
import { integrationProcedure, router } from "../_core/trpc";
import { scanDR80 } from "../services/dr80ScannerService";

const mockedScan = vi.mocked(scanDR80);

const samplePick = {
  symbol: "AAPL80",
  currentPrice: 10,
  changePct: 1.5,
  ema25: 9.8,
  ema50: 9.5,
  ema75: 9.2,
  emaAligned: true,
  emaScore: 3,
  rsi: 52,
  rsiScore: 3,
  macdLine: 0.2,
  signalLine: 0.1,
  histogram: 0.1,
  macdScore: 3,
  camarilla: {
    pivot: 10,
    R1: 10.5,
    R2: 11,
    R3: 11.5,
    R4: 12,
    S1: 9.5,
    S2: 9,
    S3: 8.5,
    S4: 8,
  },
  camScore: 3,
  entry: 9.8,
  tp1: 10.5,
  tp2: 11,
  sl: 9,
  riskReward: 1.75,
  totalScore: 16,
  reason: "EMA และ MACD เป็นบวก",
};

function caller(token?: string) {
  return integrationsRouter.createCaller({
    req: { headers: token ? { authorization: `Bearer ${token}` } : {} },
  } as any);
}

describe("server-to-server DR integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DR_TRACKER_SERVICE_TOKEN = "integration-test-token";
    mockedScan.mockResolvedValue([samplePick]);
  });

  it("rejects a missing token", async () => {
    await expect(caller().dr.aiPicks()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an invalid token", async () => {
    await expect(caller("wrong-token").dr.aiPicks()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks mutations even with a valid read-only token", async () => {
    const mutationRouter = router({
      write: integrationProcedure.mutation(() => ({ ok: true })),
    });
    const mutationCaller = mutationRouter.createCaller({
      req: { headers: { authorization: "Bearer integration-test-token" } },
    } as any);

    await expect(mutationCaller.write()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns only published picks for a valid token", async () => {
    const result = await caller("integration-test-token").dr.aiPicks();
    expect(result.picks).toHaveLength(1);
    expect(Object.keys(result.picks[0]).sort()).toEqual([
      "changePct", "companyName", "confidence", "currentPrice", "entry",
      "reason", "riskReward", "scannedAt", "setup", "sl", "source",
      "symbol", "totalScore", "tp1", "tp2", "underlyingSymbol",
    ].sort());
    expect(result.picks[0]).toMatchObject({
      symbol: "AAPL80",
      underlyingSymbol: "AAPL",
      source: "settrade",
      entry: 9.8,
      tp1: 10.5,
      tp2: 11,
      sl: 9,
    });
    expect(result.picks[0]).not.toHaveProperty("camarilla");
    expect(result.picks[0]).not.toHaveProperty("universe");
    expect(JSON.stringify(result)).not.toContain("integration-test-token");
  });

  it("returns technical plan details only for a published pick", async () => {
    const result = await caller("integration-test-token").dr.plan({ symbol: "AAPL80" });
    expect(result).toMatchObject({
      symbol: "AAPL80",
      source: "settrade",
      entry: 9.8,
      tp1: 10.5,
      tp2: 11,
      sl: 9,
    });
    expect(result.support.s3).toBe(8.5);
    expect(result.resistance.r1).toBe(10.5);
  });

  it("does not return a plan for a non-published symbol", async () => {
    await expect(caller("integration-test-token").dr.plan({ symbol: "NVDA80" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
