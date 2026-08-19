import { describe, expect, it } from "vitest";
import { dr80ScannerRouter } from "./dr80Scanner";

describe("DR80 scanner public-surface protections", () => {
  const caller = dr80ScannerRouter.createCaller({ user: null } as any);

  it("blocks the full universe from unauthenticated callers", async () => {
    await expect(caller.getUniverse()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks full scans from unauthenticated callers", async () => {
    await expect(caller.getFullScan()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks Telegram mutation from unauthenticated callers", async () => {
    await expect(caller.sendTodaysPicksToTelegram()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
