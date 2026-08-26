/**
 * Broker API Service boundary.
 *
 * Account and portfolio reads remain unavailable until a verified read-only
 * broker adapter is configured. This module never fabricates financial data.
 */

export interface BrokerPortfolioData {
  symbol: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
}

export interface BrokerAccountInfo {
  accountId: string;
  balance: number;
  equity: number;
  buyingPower: number;
}

function unavailable(): never {
  throw new Error("Broker portfolio adapter is not configured; live portfolio data unavailable");
}

export async function getBrokerAccountInfo(): Promise<BrokerAccountInfo> {
  return unavailable();
}

export async function getBrokerPortfolio(): Promise<BrokerPortfolioData[]> {
  return unavailable();
}

export async function validateBrokerConnection(): Promise<boolean> {
  return false;
}

export function getBrokerApiStatus() {
  return {
    hasCredentials: false,
    hasApiKey: false,
    mode: "unavailable" as const,
  };
}
