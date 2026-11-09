import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express, Request, Response } from "express";
import { setupTelegramWebhook } from "./_core/telegramWebhook";
import { sdk } from "./_core/sdk";
import { createMarketDataAccess, parsePriceSymbols } from "./_core/marketDataAccess";

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn() } }));
type Handler = (req: Request, res: Response) => unknown;
function response() {
  const res = { status: vi.fn(), json: vi.fn(), set: vi.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res); res.set.mockReturnValue(res);
  return res;
}
function request(headers: Record<string, string> = {}) {
  return { headers, get: (name: string) => headers[name.toLowerCase()], body: {}, socket: {} } as Request;
}
function webhookRoutes() {
  const routes = new Map<string, Handler>();
  const app = {
    post: (path: string, fn: Handler) => routes.set(`POST ${path}`, fn),
    get: (path: string, fn: Handler) => routes.set(`GET ${path}`, fn),
  };
  setupTelegramWebhook(app as unknown as Express);
  return routes;
}
beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-only-bot-placeholder");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "test-only-callback-secret");
  vi.stubEnv("DR_TRACKER_SERVICE_TOKEN", "test-only-integration-token");
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ ok: true }) })));
  vi.mocked(sdk.authenticateRequest).mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Telegram callback HTTP boundary", () => {
  it("rejects unsigned updates without contacting Telegram", async () => {
    const res = response();
    await webhookRoutes().get("POST /api/telegram/webhook")!(request(), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("disables callbacks until the callback secret is configured", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    const res = response();
    await webhookRoutes().get("POST /api/telegram/webhook")!(request(), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts Telegram's signed start message with a mocked send", async () => {
    const req = request({ "x-telegram-bot-api-secret-token": "test-only-callback-secret" });
    req.body = { message: { text: "/start", chat: { id: 1 }, from: { first_name: "Test" } } };
    const res = response();
    await webhookRoutes().get("POST /api/telegram/webhook")!(req, res as unknown as Response);
    expect(fetch).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
  it("never changes the webhook from a GET request", async () => {
    const res = response();
    await webhookRoutes().get("GET /api/telegram/webhook/set")!(request(), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires an administrator for webhook setup", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValueOnce(new Error("No login"));
    const res = response();
    await webhookRoutes().get("POST /api/telegram/webhook/set")!(request(), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the configured HTTPS URL instead of the request Host", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ role: "admin" } as never);
    vi.stubEnv("PUBLIC_URL", "https://configured.example");
    await webhookRoutes().get("POST /api/telegram/webhook/set")!(
      request({ host: "attacker.example" }), response() as unknown as Response
    );
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.url).toBe("https://configured.example/api/telegram/webhook");
    expect(body.secret_token).toBe("test-only-callback-secret");
  });
});

describe("Raw market data HTTP boundary", () => {
  it("rejects anonymous requests before any provider calls", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValue(new Error("No login"));
    const res = response(); const next = vi.fn();
    await createMarketDataAccess()(request(), res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
  });
  it("limits authenticated service traffic", async () => {
    const access = createMarketDataAccess(); const next = vi.fn();
    const req = request({ authorization: "Bearer test-only-integration-token" });
    for (let i = 0; i < 10; i++) await access(req, response() as unknown as Response, next);
    const res = response(); await access(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(10); expect(res.status).toHaveBeenCalledWith(429);
  });
  it("validates, deduplicates and bounds symbol batches", () => {
    expect(parsePriceSymbols(" aapl80,AAPL80,nvda23 ")).toEqual(["AAPL80", "NVDA23"]);
    expect(parsePriceSymbols("../../secret")).toBeNull();
    expect(parsePriceSymbols(Array.from({ length: 21 }, (_, i) => `X${i}80`).join(","))).toBeNull();
    expect(parsePriceSymbols(["AAPL80"])).toBeNull();
  });
});
