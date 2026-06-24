/**
 * Calculation Service
 * Handles auto-calculations for DR picks status, returns, and performance metrics
 */

export interface CalculatedMetrics {
  returnPercent: number;
  distanceToTp1: number;
  distanceToTp2: number;
  distanceToSl: number;
  riskRewardRatio: number;
  status: "Hit TP2" | "Hit TP1" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist";
}

export interface PerformanceMetrics {
  totalPicks: number;
  activePicks: number;
  hitTp1: number;
  hitTp2: number;
  hitSl: number;
  nearTp: number;
  nearSl: number;
  closedPicks: number;
  watchlistPicks: number;
  winRate: number;
  averageReturn: number;
}

/**
 * Calculate return percentage
 * Formula: (current_price - entry_price) / entry_price * 100
 */
export function calculateReturnPercent(currentPrice: number, entryPrice: number): number {
  if (entryPrice === 0) return 0;
  return ((currentPrice - entryPrice) / entryPrice) * 100;
}

/**
 * Calculate distance to target price
 * Returns the percentage distance
 */
export function calculateDistanceToTarget(currentPrice: number, targetPrice: number): number {
  if (targetPrice === 0) return 0;
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

/**
 * Calculate risk/reward ratio
 * Formula: (TP - Entry) / (Entry - SL)
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  tp: number,
  sl: number
): number {
  const reward = tp - entryPrice;
  const risk = entryPrice - sl;

  if (risk === 0) return 0;
  return reward / risk;
}

/**
 * Determine status based on current price and targets
 * Threshold for "Near" is 2% (configurable)
 */
export function determineStatus(
  currentPrice: number,
  entryPrice: number,
  tp1: number,
  tp2: number,
  sl: number,
  isActive: boolean,
  closedAt: Date | null,
  nearThreshold: number = 2
): "Hit TP2" | "Hit TP1" | "Hit SL" | "Near TP" | "Near SL" | "Waiting" | "Closed" | "Watchlist" {
  // If closed, return Closed status
  if (closedAt) {
    return "Closed";
  }

  // If not active, return Watchlist
  if (!isActive) {
    return "Watchlist";
  }

  // Check if hit TP2
  if (currentPrice >= tp2) {
    return "Hit TP2";
  }

  // Check if hit TP1
  if (currentPrice >= tp1) {
    return "Hit TP1";
  }

  // Check if hit SL
  if (currentPrice <= sl) {
    return "Hit SL";
  }

  // Check if near TP (within 2% of TP1 or TP2)
  const distanceToTp1 = calculateDistanceToTarget(currentPrice, tp1);
  const distanceToTp2 = calculateDistanceToTarget(currentPrice, tp2);

  if (distanceToTp1 > 0 && distanceToTp1 <= nearThreshold) {
    return "Near TP";
  }

  if (distanceToTp2 > 0 && distanceToTp2 <= nearThreshold) {
    return "Near TP";
  }

  // Check if near SL (within 2% of SL)
  // If price is below SL, distance will be negative
  // We want to catch when price is close to SL from above
  const distanceToSlPercent = ((sl - currentPrice) / currentPrice) * 100;
  if (distanceToSlPercent > 0 && distanceToSlPercent <= nearThreshold) {
    return "Near SL";
  }

  // Default: Waiting
  return "Waiting";
}

/**
 * Calculate all metrics for a DR pick
 */
export function calculateMetrics(
  currentPrice: number,
  entryPrice: number,
  tp1: number,
  tp2: number,
  sl: number,
  isActive: boolean,
  closedAt: Date | null
): CalculatedMetrics {
  const returnPercent = calculateReturnPercent(currentPrice, entryPrice);
  const distanceToTp1 = calculateDistanceToTarget(currentPrice, tp1);
  const distanceToTp2 = calculateDistanceToTarget(currentPrice, tp2);
  const distanceToSl = calculateDistanceToTarget(currentPrice, sl);
  const riskRewardRatio = calculateRiskRewardRatio(entryPrice, tp2, sl);
  const status = determineStatus(currentPrice, entryPrice, tp1, tp2, sl, isActive, closedAt);

  return {
    returnPercent,
    distanceToTp1,
    distanceToTp2,
    distanceToSl,
    riskRewardRatio,
    status,
  };
}

/**
 * Calculate performance metrics from multiple picks
 */
export function calculatePerformanceMetrics(picks: Array<{
  currentPrice: number;
  entryPrice: number;
  tp1: number;
  tp2: number;
  sl: number;
  isActive: boolean;
  closedAt: Date | null;
  status: string;
}>): PerformanceMetrics {
  const totalPicks = picks.length;
  let activePicks = 0;
  let hitTp1 = 0;
  let hitTp2 = 0;
  let hitSl = 0;
  let nearTp = 0;
  let nearSl = 0;
  let closedPicks = 0;
  let watchlistPicks = 0;
  let totalReturn = 0;
  let winCount = 0;

  picks.forEach((pick) => {
    const metrics = calculateMetrics(
      pick.currentPrice,
      pick.entryPrice,
      pick.tp1,
      pick.tp2,
      pick.sl,
      pick.isActive,
      pick.closedAt
    );

    // Count by status
    if (metrics.status === "Hit TP2") hitTp2++;
    if (metrics.status === "Hit TP1") hitTp1++;
    if (metrics.status === "Hit SL") hitSl++;
    if (metrics.status === "Near TP") nearTp++;
    if (metrics.status === "Near SL") nearSl++;
    if (metrics.status === "Closed") closedPicks++;
    if (metrics.status === "Watchlist") watchlistPicks++;
    if (pick.isActive && !pick.closedAt) activePicks++;

    // Calculate returns for closed picks
    if (pick.closedAt) {
      totalReturn += metrics.returnPercent;
      if (metrics.returnPercent > 0) winCount++;
    }
  });

  const winRate = closedPicks > 0 ? (winCount / closedPicks) * 100 : 0;
  const averageReturn = closedPicks > 0 ? totalReturn / closedPicks : 0;

  return {
    totalPicks,
    activePicks,
    hitTp1,
    hitTp2,
    hitSl,
    nearTp,
    nearSl,
    closedPicks,
    watchlistPicks,
    winRate,
    averageReturn,
  };
}
