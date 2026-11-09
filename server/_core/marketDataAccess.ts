import type { RequestHandler } from "express";
import { sdk } from "./sdk";
import { hasValidServiceToken } from "./trpc";

export function parsePriceSymbols(value: unknown): string[] | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  const symbols = Array.from(new Set(value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)));
  return symbols.length > 0 && symbols.length <= 20 && symbols.every(s => /^[A-Z0-9]{1,20}$/.test(s))
    ? symbols : null;
}

export function createMarketDataAccess(): RequestHandler {
  const requests = new Map<string, { until: number; count: number }>();
  return async (req, res, next) => {
    let principal: string;
    if (hasValidServiceToken(req.headers.authorization)) principal = "integration-service";
    else {
      try {
        const user = await sdk.authenticateRequest(req);
        if (user.role !== "admin" && user.accessEnabled === 0) {
          res.status(403).json({ ok: false, error: "access-disabled" });
          return;
        }
        principal = `user:${user.id}`;
      } catch {
        res.status(401).json({ ok: false, error: "authentication-required" });
        return;
      }
    }
    const now = Date.now();
    requests.forEach((budget, key) => { if (budget.until <= now) requests.delete(key); });
    const budget = requests.get(principal) ?? { until: now + 60_000, count: 0 };
    if (budget.count >= 10) {
      res.set("Retry-After", String(Math.ceil((budget.until - now) / 1000)));
      res.status(429).json({ ok: false, error: "market-request-limit" });
      return;
    }
    budget.count++;
    requests.set(principal, budget);
    next();
  };
}
