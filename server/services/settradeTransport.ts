import { setTimeout as sleep } from "node:timers/promises";

/** Share the provider's request budget across quotes, charts, and LAN viewers. */
export function createSettradeTransport(intervalMs = 250) {
  let queue: Promise<void> = Promise.resolve();
  let nextRequestAt = 0;

  async function waitForTurn() {
    const turn = queue.then(async () => {
      while (Date.now() < nextRequestAt) await sleep(nextRequestAt - Date.now());
      nextRequestAt = Date.now() + intervalMs;
    });
    queue = turn.catch(() => {});
    await turn;
  }

  return async function request(send: () => Promise<Response>): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      await waitForTurn();
      const response = await send();
      if (response.status !== 429 || attempt >= 2) return response;
      const header = response.headers.get("retry-after");
      const seconds = header ? Number(header) : NaN;
      const retryMs = Number.isFinite(seconds) ? seconds * 1000
        : header ? Date.parse(header) - Date.now() : 2000 * (attempt + 1);
      const pause = Math.min(60_000, Math.max(1000, Number.isFinite(retryMs) ? retryMs : 2000));
      nextRequestAt = Math.max(nextRequestAt, Date.now() + pause);
      await response.body?.cancel();
    }
  };
}

const configuredInterval = Number(process.env.SETTRADE_REQUEST_INTERVAL_MS ?? 250);
export const requestSettrade = createSettradeTransport(
  Number.isFinite(configuredInterval) ? Math.max(100, configuredInterval) : 250
);
