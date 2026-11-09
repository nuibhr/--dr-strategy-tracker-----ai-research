import { IncomingMessage } from "node:http";
import { Socket } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { isLanScannerRequest } from "./_core/lanAccess";
import { getSessionCookieOptions } from "./_core/cookies";
import { dr80ScannerRouter } from "./routers/dr80Scanner";
import { scanDR80 } from "./services/dr80ScannerService";

vi.mock("./services/dr80ScannerService", () => ({ scanDR80: vi.fn(async () => []) }));
vi.mock("./services/marketDataService", () => ({
  fetchPriceData: vi.fn(async () => { throw new Error("Test: market unavailable"); }),
  getMarketDataStatus: vi.fn(() => ({ hasCredentials: false })),
}));
vi.mock("./services/telegramService", () => ({
  formatDR80ScanMessage: vi.fn(), sendTelegramMessage: vi.fn(),
}));

function context(peer = "192.168.12.50", host = "192.168.12.37:3000"): TrpcContext {
  const req = new IncomingMessage(new Socket());
  Object.defineProperty(req.socket, "remoteAddress", { value: peer });
  req.headers.host = host;
  return { req: req as TrpcContext["req"], res: {} as TrpcContext["res"], user: null };
}

beforeEach(() => { vi.stubEnv("LAN_PUBLIC_SCANNER", "true"); });
afterEach(() => { vi.unstubAllEnvs(); });

describe("LAN scanner access boundary", () => {
  it("lets anonymous LAN viewers use the scanner and share a single running scan", async () => {
    const caller = dr80ScannerRouter.createCaller(context());
    expect(await caller.getAccessMode()).toEqual({ lanPublicScanner: true });
    const [first, second] = await Promise.all([
      caller.getTodaysPicks({ forceRefresh: true }),
      caller.getTodaysPicks({ forceRefresh: true }),
    ]);
    expect(first.picks).toEqual([]);
    expect(second.scannedAt).toEqual(first.scannedAt);
    expect(scanDR80).toHaveBeenCalledTimes(1);
    expect((await caller.getTodaysPicks({ forceRefresh: true })).fromCache).toBe(true);
    expect(scanDR80).toHaveBeenCalledTimes(1);
  });

  it("keeps admin-only queries and Telegram sending forbidden to LAN guests", async () => {
    const caller = dr80ScannerRouter.createCaller(context());
    await expect(caller.getFullScan()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.getUniverse()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.sendTodaysPicksToTelegram()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not expose anonymous scanning when LAN mode is off", async () => {
    vi.stubEnv("LAN_PUBLIC_SCANNER", "false");
    const caller = dr80ScannerRouter.createCaller(context());
    expect((await caller.getAccessMode()).lanPublicScanner).toBe(false);
    await expect(caller.getTodaysPicks()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects public TCP peers even with forged forwarded headers", async () => {
    const ctx = context("203.0.113.9");
    ctx.req.headers["x-forwarded-for"] = "192.168.12.50";
    await expect(dr80ScannerRouter.createCaller(ctx).getTodaysPicks())
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects public hostnames from a loopback tunnel", () => {
    expect(isLanScannerRequest(context("127.0.0.1", "example.trycloudflare.com").req)).toBe(false);
  });

  it.each(["127.0.0.1", "10.1.2.3", "172.16.4.5", "192.168.12.50", "::ffff:192.168.12.50", "::1"])(
    "recognizes the local peer %s", peer => {
      expect(isLanScannerRequest(context(peer).req)).toBe(true);
    }
  );

  it("uses an HTTP-compatible host-only cookie for LAN login", () => {
    const req = context().req;
    Object.defineProperty(req, "protocol", { value: "http" });
    expect(getSessionCookieOptions(req)).toMatchObject({ secure: false, sameSite: "lax", httpOnly: true });
    expect(getSessionCookieOptions(req).domain).toBeUndefined();
  });
});
