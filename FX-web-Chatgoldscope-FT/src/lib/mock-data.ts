import type { AnalysisResponse, MarketQuote } from "@/types/market";

export const mockQuote: MarketQuote = {
  symbol: "XAU/USD",
  bid: 2378.42,
  ask: 2378.68,
  spread: 0.26,
  session: "New York",
  status: "open",
  provider: "Demo Feed",
  updatedAt: new Date().toISOString(),
};

export const mockAnalysis: AnalysisResponse = {
  marketCondition: "H4 structure remains constructive while H1 is consolidating below resistance.",
  positionStatus: "No open position details supplied.",
  mainRisk: "Price is near a decision zone; entering without confirmation may create poor reward-to-risk.",
  bullishScenario: "A confirmed hold above resistance followed by a controlled retest would strengthen the bullish case.",
  bearishScenario: "A rejection and close below immediate support would weaken the short-term structure.",
  nextStep: "Wait for confirmation and define invalidation before calculating position size.",
  supports: [2368.2, 2359.8],
  resistances: [2384.5, 2391.1],
  dataTimestamp: new Date().toISOString(),
};
