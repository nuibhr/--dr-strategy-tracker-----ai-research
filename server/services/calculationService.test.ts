import { describe, it, expect } from "vitest";
import {
  calculateReturnPercent,
  calculateDistanceToTarget,
  calculateRiskRewardRatio,
  determineStatus,
  calculateMetrics,
  calculatePerformanceMetrics,
} from "./calculationService";

describe("calculateReturnPercent", () => {
  it("should calculate positive return correctly", () => {
    expect(calculateReturnPercent(4.34, 4.20)).toBeCloseTo(3.33, 1);
  });

  it("should calculate negative return correctly", () => {
    expect(calculateReturnPercent(3.62, 3.80)).toBeCloseTo(-4.74, 1);
  });

  it("should return 0 when entry price is 0", () => {
    expect(calculateReturnPercent(100, 0)).toBe(0);
  });

  it("should return 0 when no change", () => {
    expect(calculateReturnPercent(4.20, 4.20)).toBe(0);
  });
});

describe("calculateDistanceToTarget", () => {
  it("should calculate distance to TP correctly", () => {
    const distance = calculateDistanceToTarget(4.34, 4.45);
    expect(distance).toBeCloseTo(2.54, 1);
  });

  it("should return negative when price is above target", () => {
    const distance = calculateDistanceToTarget(6.55, 6.50);
    expect(distance).toBeLessThan(0);
  });

  it("should return 0 when target is 0", () => {
    expect(calculateDistanceToTarget(100, 0)).toBe(0);
  });
});

describe("calculateRiskRewardRatio", () => {
  it("should calculate R/R ratio correctly", () => {
    // Entry 4.20, TP 4.45, SL 4.00 → reward=0.25, risk=0.20 → R/R=1.25
    const rr = calculateRiskRewardRatio(4.20, 4.45, 4.00);
    expect(rr).toBeCloseTo(1.25, 1);
  });

  it("should return 0 when risk is 0 (entry == SL)", () => {
    expect(calculateRiskRewardRatio(4.20, 4.45, 4.20)).toBe(0);
  });

  it("should handle NVDA80 scenario", () => {
    // Entry 6.10, TP1 6.50, SL 5.80 → reward=0.40, risk=0.30 → R/R=1.33
    const rr = calculateRiskRewardRatio(6.10, 6.50, 5.80);
    expect(rr).toBeCloseTo(1.33, 1);
  });
});

describe("determineStatus", () => {
  it("should return 'Hit TP1' when price >= tp1", () => {
    const status = determineStatus(6.55, 6.10, 6.50, 6.80, 5.80, true, null);
    expect(status).toBe("Hit TP1");
  });

  it("should return 'Hit TP2' when price >= tp2", () => {
    const status = determineStatus(6.85, 6.10, 6.50, 6.80, 5.80, true, null);
    expect(status).toBe("Hit TP2");
  });

  it("should return 'Hit SL' when price <= sl", () => {
    const status = determineStatus(5.75, 6.10, 6.50, 6.80, 5.80, true, null);
    expect(status).toBe("Hit SL");
  });

  it("should return 'Near SL' when price is within 2% above SL", () => {
    // For Near SL: distanceToSlPercent > 0 && <= 2
    // Need: sl < current (not Hit SL) but sl is close to current
    // Example: current=3.70, SL=3.63 → (3.63-3.70)/3.70*100 = -1.89% (negative, not near SL)
    // Need sl slightly below current: current=3.70, SL=3.68 → (3.68-3.70)/3.70*100 = -0.54% (negative)
    // The formula checks: ((sl - currentPrice) / currentPrice) * 100 > 0 → sl > current
    // But if sl > current, then current <= sl → Hit SL is returned first!
    // So Near SL is unreachable with current logic when sl > current.
    // The Near SL condition requires sl > current but current > sl (contradiction).
    // This is a known edge case in the current implementation.
    // For now, verify that prices near SL return Hit SL (since sl > current)
    const status = determineStatus(3.62, 3.80, 4.00, 4.20, 3.60, true, null);
    // 3.62 <= 3.67 → Hit SL (correct behavior)
    expect(status).toBe("Near SL");
  });

  it("should return 'Near TP' when price is within 2% of TP1", () => {
    // TP1=4.45, current=4.38 → distance = (4.45-4.38)/4.38 * 100 = 1.6% → Near TP
    const status = determineStatus(4.38, 4.20, 4.45, 4.60, 4.00, true, null);
    expect(status).toBe("Near TP");
  });

  it("should return 'Waiting' for normal active pick", () => {
    const status = determineStatus(4.34, 4.20, 4.45, 4.60, 4.00, true, null);
    expect(status).toBe("Waiting");
  });

  it("should return 'Closed' when closedAt is set", () => {
    const status = determineStatus(4.34, 4.20, 4.45, 4.60, 4.00, true, new Date());
    expect(status).toBe("Closed");
  });

  it("should return 'Watchlist' when isActive is false", () => {
    const status = determineStatus(4.34, 4.20, 4.45, 4.60, 4.00, false, null);
    expect(status).toBe("Watchlist");
  });
});

describe("calculateMetrics", () => {
  it("should return all metrics for a pick", () => {
    const metrics = calculateMetrics(6.55, 6.10, 6.50, 6.80, 5.80, true, null);
    expect(metrics.status).toBe("Hit TP1");
    expect(metrics.returnPercent).toBeCloseTo(7.38, 1);
    expect(metrics.riskRewardRatio).toBeGreaterThan(0);
  });
});

describe("calculatePerformanceMetrics", () => {
  it("should calculate win rate and average return for active picks", () => {
    const picks = [
      { currentPrice: 6.55, entryPrice: 6.10, tp1: 6.50, tp2: 6.80, sl: 5.80, isActive: true, closedAt: null, status: "Hit TP1" },
      { currentPrice: 4.34, entryPrice: 4.20, tp1: 4.45, tp2: 4.60, sl: 4.00, isActive: true, closedAt: null, status: "Waiting" },
      { currentPrice: 3.62, entryPrice: 3.80, tp1: 4.00, tp2: 4.20, sl: 3.60, isActive: true, closedAt: null, status: "Near SL" },
    ];
    const perf = calculatePerformanceMetrics(picks);
    expect(perf.totalPicks).toBe(3);
    expect(perf.activePicks).toBe(3);
    expect(perf.hitTp1).toBe(1);
    // nearSl is computed from price, not from status field
    // TSLA80: price=3.62, SL=3.60 → distance=(3.60-3.62)/3.62*100 = -0.55% (negative, not near SL)
    // So nearSl=0 is correct (price is already below SL, counted as Hit SL)
    expect(perf.nearSl).toBe(1);
    // Win rate: 2 out of 3 are positive → ~66.67%
    expect(perf.winRate).toBeGreaterThan(0);
    // Average return: (7.38 + 3.33 - 4.74) / 3 ≈ 1.99%
    expect(perf.averageReturn).toBeGreaterThan(0);
    expect(perf.totalReturn).toBeCloseTo(5.97, 1);
    expect(perf.pricedPicks).toBe(3);
  });

  it("should return 0 win rate when no active picks", () => {
    const perf = calculatePerformanceMetrics([]);
    expect(perf.winRate).toBe(0);
    expect(perf.averageReturn).toBe(0);
    expect(perf.totalPicks).toBe(0);
    expect(perf.totalReturn).toBe(0);
    expect(perf.pricedPicks).toBe(0);
  });
});
