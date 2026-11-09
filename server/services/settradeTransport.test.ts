import { afterEach, describe, expect, it, vi } from "vitest";
import { createSettradeTransport } from "./settradeTransport";

afterEach(() => { vi.useRealTimers(); });

describe("shared Settrade request transport", () => {
  it("spaces simultaneous requests instead of sending a burst", async () => {
    const request = createSettradeTransport(30);
    const starts: number[] = [];
    await Promise.all(Array.from({ length: 3 }, () => request(async () => {
      starts.push(Date.now());
      return new Response("{}", { status: 200 });
    })));
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(30);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(30);
  });

  it("honors Retry-After on a rate-limit response and retries", async () => {
    const request = createSettradeTransport(10);
    const send = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "1" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const start = Date.now();
    expect((await request(send)).status).toBe(200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent errors or turn them into fake data", async () => {
    const request = createSettradeTransport(10);
    const response = new Response("unavailable", { status: 403 });
    const send = vi.fn(async () => response);
    expect(await request(send)).toBe(response);
    expect(send).toHaveBeenCalledOnce();
  });
});
