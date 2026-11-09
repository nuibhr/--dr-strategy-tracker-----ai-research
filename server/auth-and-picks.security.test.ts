import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx: TrpcContext = {
  user: { id: 7, role: "user", accessEnabled: 1, passwordHash: "fixture-hash-not-a-real-secret" } as TrpcContext["user"],
  req: { headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};
describe("session response and shared plan permissions", () => {
  it("never exposes password hashes in auth.me", async () => {
    const user = await appRouter.createCaller(ctx).auth.me();
    expect(user).toHaveProperty("id", 7);
    expect(user).not.toHaveProperty("passwordHash");
  });
  it("requires admin permission to mutate globally shared DR plans", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.drPicks.create({ symbol: "AAPL80", name: "Fixture", market: "SET",
      entryDate: new Date(), entryPrice: "1", tp1: "2", tp2: "3", sl: "0.5" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.drPicks.update({ id: 1, data: { note: "fixture" } }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.drPicks.delete({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.drPicks.refreshPrices()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
