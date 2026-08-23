export type MarketStatus = "open" | "closed" | "stale";

export interface MarketQuote {
  symbol: "XAU/USD";
  bid: number;
  ask: number;
  spread: number;
  session: string;
  status: MarketStatus;
  provider: string;
  updatedAt: string;
}

export interface AnalysisResponse {
  marketCondition: string;
  positionStatus: string;
  mainRisk: string;
  bullishScenario: string;
  bearishScenario: string;
  nextStep: string;
  supports: number[];
  resistances: number[];
  dataTimestamp: string;
}
