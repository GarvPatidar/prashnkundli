export type RiskLevel =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "EXTREME";

export type TradeEnvironment =
  | "FAVORABLE"
  | "CAUTION"
  | "AVOID";

export interface RiskFactor {
  code: string;
  level: RiskLevel;
  score: number;
  message: string;
}

export interface RiskAssessmentResult {
  overallRisk: RiskLevel;
  tradeEnvironment: TradeEnvironment;

  riskScore: number;

  factors: RiskFactor[];
  warnings: string[];

  generatedAt: string;
}