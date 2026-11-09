import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { portfolioRouter } from "./portfolio";
import * as db from "../db";

vi.mock("../db", () => ({
  getUserPortfolios: vi.fn(async (userId: number) => [{ id: userId * 10, userId }]),
  createPortfolio: vi.fn(async () => ({ success: true })),
  getPortfolioPositions: vi.fn(async (portfolioId: number) => [{ id: portfolioId * 10, portfolioId }]),
  getPositionById: vi.fn(async (positionId: number) => positionId === 100
    ? { id: 100, portfolioId: 10 } : positionId === 200 ? { id: 200, portfolioId: 20 } : null),
  createPosition: vi.fn(async () => ({ success: true })),
  updatePosition: vi.fn(async () => ({ success: true })),
  getPositionAlerts: vi.fn(async () => []),
  createAlert: vi.fn(async () => ({ success: true })),
}));

function caller(userId: number, role: "user" | "admin" = "user") {
  const user: NonNullable<TrpcContext["user"]> = {
    id: userId, openId: `test:${userId}`, email: `user${userId}@example.test`,
    name: `User ${userId}`, passwordHash: null, loginMethod: "password", role,
    accessEnabled: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return portfolioRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

const positionInput = {
  portfolioId: 10, ticker: "AAPL80", drName: "Apple DR", entryPrice: "10",
  stopLoss: "9", takeProfit: "12",
};

beforeEach(() => { vi.clearAllMocks(); });

describe("portfolio ownership at route boundaries", () => {
  it("rejects reading another user's portfolio positions", async () => {
    await expect(caller(2).getPositions({ portfolioId: 10 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getPortfolioPositions).not.toHaveBeenCalled();
  });

  it("rejects inserting a position into another user's portfolio", async () => {
    await expect(caller(2).addPosition(positionInput)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.createPosition).not.toHaveBeenCalled();
  });

  it("rejects reading another user's position", async () => {
    await expect(caller(2).getPosition({ positionId: 100 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects updating another user's position", async () => {
    await expect(caller(2).updatePosition({ positionId: 100, status: "closed" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.updatePosition).not.toHaveBeenCalled();
  });

  it("rejects reading alerts belonging to another user's position", async () => {
    await expect(caller(2).getAlerts({ positionId: 100 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getPositionAlerts).not.toHaveBeenCalled();
  });

  it("rejects creating alerts for another user's position", async () => {
    await expect(caller(2).createAlert({ positionId: 100, type: "price_alert", targetPrice: "11" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.createAlert).not.toHaveBeenCalled();
  });

  it("keeps private portfolios private even from another admin account", async () => {
    await expect(caller(2, "admin").getPosition({ positionId: 100 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns not found for a missing position without querying alerts", async () => {
    await expect(caller(1).getAlerts({ positionId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getPositionAlerts).not.toHaveBeenCalled();
  });

  it("preserves every position and alert workflow for the owner", async () => {
    const owner = caller(1);
    expect(await owner.getPositions({ portfolioId: 10 })).toEqual([{ id: 100, portfolioId: 10 }]);
    expect(await owner.getPosition({ positionId: 100 })).toEqual({ id: 100, portfolioId: 10 });
    await owner.addPosition(positionInput);
    expect(db.createPosition).toHaveBeenCalledWith({ ...positionInput, quantity: "1", ratio: "1" });
    await owner.updatePosition({ positionId: 100, currentPrice: "11" });
    expect(db.updatePosition).toHaveBeenCalledWith(100, { currentPrice: "11" });
    expect(await owner.getAlerts({ positionId: 100 })).toEqual([]);
    await owner.createAlert({ positionId: 100, type: "price_alert", targetPrice: "11" });
    expect(db.createAlert).toHaveBeenCalledWith({ positionId: 100, type: "price_alert", targetPrice: "11" });
  });
});
