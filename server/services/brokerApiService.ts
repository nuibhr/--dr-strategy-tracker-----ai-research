/**
 * Broker API Service
 * Handles communication with broker APIs
 * Currently uses mock data, can be extended to support real broker APIs
 * 
 * Important: This service is READ-ONLY
 * - No order placement
 * - No trading operations
 * - Only fetches price data and portfolio information
 */

import { ENV } from "../_core/env";

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

/**
 * Check if broker API credentials are available
 */
function hasValidCredentials(): boolean {
  const appId = process.env.BROKER_APP_ID;
  const secret = process.env.BROKER_API_SECRET;
  const apiKey = process.env.BROKER_API_KEY;

  // Require at least App ID and Secret
  // API Key is optional for mock mode
  return !!(appId && secret);
}

/**
 * Get broker account information
 * Currently returns mock data
 */
export async function getBrokerAccountInfo(): Promise<BrokerAccountInfo> {
  try {
    if (!hasValidCredentials()) {
      console.warn("[brokerApiService] Missing broker credentials, using mock data");
      return getMockAccountInfo();
    }

    // TODO: Replace with real API call when full credentials are available
    // For now, use mock data
    return getMockAccountInfo();
  } catch (error) {
    console.error("[brokerApiService] Error fetching account info:", error);
    return getMockAccountInfo();
  }
}

/**
 * Get broker portfolio data
 * Currently returns mock data
 */
export async function getBrokerPortfolio(): Promise<BrokerPortfolioData[]> {
  try {
    if (!hasValidCredentials()) {
      console.warn("[brokerApiService] Missing broker credentials, using mock data");
      return getMockPortfolio();
    }

    // TODO: Replace with real API call when full credentials are available
    // For now, use mock data
    return getMockPortfolio();
  } catch (error) {
    console.error("[brokerApiService] Error fetching portfolio:", error);
    return getMockPortfolio();
  }
}

/**
 * Get mock account information for testing
 */
function getMockAccountInfo(): BrokerAccountInfo {
  return {
    accountId: "MOCK_ACC_001",
    balance: 1000000,
    equity: 1050000,
    buyingPower: 500000,
  };
}

/**
 * Get mock portfolio data for testing
 */
function getMockPortfolio(): BrokerPortfolioData[] {
  return [
    {
      symbol: "AAPL80",
      quantity: 100,
      currentPrice: 6.50,
      totalValue: 650,
    },
    {
      symbol: "NVDA80",
      quantity: 50,
      currentPrice: 7.20,
      totalValue: 360,
    },
  ];
}

/**
 * Validate broker API connection
 * Used to check if broker API is accessible
 */
export async function validateBrokerConnection(): Promise<boolean> {
  try {
    if (!hasValidCredentials()) {
      console.warn("[brokerApiService] Missing broker credentials, cannot validate connection");
      return false;
    }

    // TODO: Implement real API validation when credentials are available
    // For now, return true for mock mode
    return true;
  } catch (error) {
    console.error("[brokerApiService] Error validating broker connection:", error);
    return false;
  }
}

/**
 * Get broker API status
 */
export function getBrokerApiStatus() {
  const hasCredentials = hasValidCredentials();
  const appId = process.env.BROKER_APP_ID;
  const hasApiKey = !!process.env.BROKER_API_KEY;

  return {
    hasCredentials,
    appId: appId ? "***" : undefined,
    hasApiKey,
    mode: hasApiKey ? "production" : "mock",
  };
}
