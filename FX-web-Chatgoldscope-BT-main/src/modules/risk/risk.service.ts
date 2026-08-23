import type { ConfluenceResult } from "../analysis/confluence.service.js";
import type { MarketIntelligenceResult } from "../analysis/market-intelligence.service.js";
import type {
  RiskAssessmentResult,
  RiskFactor,
  RiskLevel,
  TradeEnvironment,
} from "./risk.types.js";

export interface RiskContextInput {
  marketIntelligence: MarketIntelligenceResult;

  newsRiskWindow?: boolean | undefined;

  minutesToHighImpactEvent?:
    | number
    | null
    | undefined;

  spreadPercent?: number | null | undefined;

  liquidityState?:
    | "HIGH"
    | "NORMAL"
    | "LOW"
    | "UNKNOWN"
    | undefined;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function getRiskLevel(
  score: number,
): RiskLevel {
  if (score >= 80) {
    return "EXTREME";
  }

  if (score >= 60) {
    return "HIGH";
  }

  if (score >= 30) {
    return "MODERATE";
  }

  return "LOW";
}

function getTradeEnvironment(
  riskLevel: RiskLevel,
): TradeEnvironment {
  switch (riskLevel) {
    case "LOW":
      return "FAVORABLE";

    case "MODERATE":
      return "CAUTION";

    case "HIGH":
    case "EXTREME":
      return "AVOID";
  }
}

function addFactor(
  factors: RiskFactor[],
  code: string,
  score: number,
  message: string,
): void {
  factors.push({
    code,
    score,
    level: getRiskLevel(score),
    message,
  });
}

function scoreConfluenceConflicts(
  confluence: ConfluenceResult,
  factors: RiskFactor[],
): void {
  const conflictCount =
    confluence.conflicts.length;

  if (conflictCount === 0) {
    return;
  }

  const score = clamp(
    conflictCount * 18,
    0,
    70,
  );

  addFactor(
    factors,
    "MULTI_TIMEFRAME_CONFLICT",
    score,
    `${conflictCount} multi-timeframe conflict(s) detected.`,
  );
}

function scoreConfidenceRisk(
  confluence: ConfluenceResult,
  factors: RiskFactor[],
): void {
  if (confluence.confidence >= 70) {
    return;
  }

  const score = clamp(
    70 - confluence.confidence,
    0,
    60,
  );

  addFactor(
    factors,
    "LOW_CONFLUENCE_CONFIDENCE",
    score,
    `Market confidence is only ${confluence.confidence}%.`,
  );
}

function scoreVolatility(
  marketIntelligence: MarketIntelligenceResult,
  factors: RiskFactor[],
): void {
  const snapshots =
    marketIntelligence.marketAnalysis
      .snapshots;

  const highVolatilityTimeframes =
    Object.entries(snapshots)
      .filter(
        ([, snapshot]) =>
          snapshot.structure.volatility ===
          "HIGH",
      )
      .map(([timeframe]) => timeframe);

  if (
    highVolatilityTimeframes.length === 0
  ) {
    return;
  }

  const score = clamp(
    20 +
      highVolatilityTimeframes.length *
        12,
    0,
    75,
  );

  addFactor(
    factors,
    "HIGH_VOLATILITY",
    score,
    `Elevated volatility detected on ${highVolatilityTimeframes.join(", ")}.`,
  );
}

function scoreDataQuality(
  marketIntelligence: MarketIntelligenceResult,
  factors: RiskFactor[],
): void {
  const incomplete =
    marketIntelligence.dataQuality
      .incompleteTimeframes;

  if (incomplete.length === 0) {
    return;
  }

  const score = clamp(
    incomplete.length * 15,
    0,
    60,
  );

  addFactor(
    factors,
    "INCOMPLETE_MARKET_HISTORY",
    score,
    `Insufficient warm-up history on ${incomplete.join(", ")}.`,
  );
}

function scoreNewsRisk(
  input: RiskContextInput,
  factors: RiskFactor[],
): void {
  if (input.newsRiskWindow) {
    addFactor(
      factors,
      "HIGH_IMPACT_NEWS_WINDOW",
      85,
      "A high-impact economic event risk window is active.",
    );

    return;
  }

  const minutes =
    input.minutesToHighImpactEvent;

  if (
    minutes === null ||
    minutes === undefined
  ) {
    return;
  }

  if (minutes <= 15) {
    addFactor(
      factors,
      "HIGH_IMPACT_EVENT_IMMINENT",
      90,
      `High-impact event is approximately ${minutes} minute(s) away.`,
    );

    return;
  }

  if (minutes <= 45) {
    addFactor(
      factors,
      "HIGH_IMPACT_EVENT_NEAR",
      65,
      `High-impact event is approximately ${minutes} minute(s) away.`,
    );

    return;
  }

  if (minutes <= 120) {
    addFactor(
      factors,
      "HIGH_IMPACT_EVENT_UPCOMING",
      35,
      `High-impact event is approximately ${minutes} minute(s) away.`,
    );
  }
}

function scoreLiquidity(
  input: RiskContextInput,
  factors: RiskFactor[],
): void {
  switch (input.liquidityState) {
    case "LOW":
      addFactor(
        factors,
        "LOW_LIQUIDITY",
        65,
        "Current market liquidity is low.",
      );
      break;

    case "UNKNOWN":
      addFactor(
        factors,
        "UNKNOWN_LIQUIDITY",
        25,
        "Liquidity quality is currently unknown.",
      );
      break;

    case "HIGH":
    case "NORMAL":
    case undefined:
      break;
  }
}

function scoreSpread(
  input: RiskContextInput,
  factors: RiskFactor[],
): void {
  const spreadPercent =
    input.spreadPercent;

  if (
    spreadPercent === null ||
    spreadPercent === undefined
  ) {
    return;
  }

  if (spreadPercent >= 0.08) {
    addFactor(
      factors,
      "EXTREME_SPREAD",
      80,
      `Spread is unusually wide at ${spreadPercent.toFixed(3)}%.`,
    );

    return;
  }

  if (spreadPercent >= 0.04) {
    addFactor(
      factors,
      "HIGH_SPREAD",
      55,
      `Spread is elevated at ${spreadPercent.toFixed(3)}%.`,
    );

    return;
  }

  if (spreadPercent >= 0.02) {
    addFactor(
      factors,
      "MODERATE_SPREAD",
      30,
      `Spread is moderately elevated at ${spreadPercent.toFixed(3)}%.`,
    );
  }
}

function calculateAggregateRisk(
  factors: readonly RiskFactor[],
): number {
  if (factors.length === 0) {
    return 10;
  }

  const scores = factors
    .map((factor) => factor.score)
    .sort(
      (first, second) =>
        second - first,
    );

  const highest =
    scores[0] ?? 0;

  const remainingAverage =
    scores.length > 1
      ? scores
          .slice(1)
          .reduce(
            (total, value) =>
              total + value,
            0,
          ) /
        (scores.length - 1)
      : 0;

  return Math.round(
    clamp(
      highest * 0.7 +
        remainingAverage * 0.3,
      0,
      100,
    ),
  );
}

export class RiskService {
  assess(
    input: RiskContextInput,
  ): RiskAssessmentResult {
    const factors: RiskFactor[] = [];

    scoreConfluenceConflicts(
      input.marketIntelligence.confluence,
      factors,
    );

    scoreConfidenceRisk(
      input.marketIntelligence.confluence,
      factors,
    );

    scoreVolatility(
      input.marketIntelligence,
      factors,
    );

    scoreDataQuality(
      input.marketIntelligence,
      factors,
    );

    scoreNewsRisk(
      input,
      factors,
    );

    scoreLiquidity(
      input,
      factors,
    );

    scoreSpread(
      input,
      factors,
    );

    const riskScore =
      calculateAggregateRisk(factors);

    const overallRisk =
      getRiskLevel(riskScore);

    return {
      overallRisk,

      tradeEnvironment:
        getTradeEnvironment(
          overallRisk,
        ),

      riskScore,

      factors,

      warnings:
        factors
          .filter(
            (factor) =>
              factor.level === "HIGH" ||
              factor.level === "EXTREME",
          )
          .map(
            (factor) => factor.message,
          ),

      generatedAt:
        new Date().toISOString(),
    };
  }
}

export const riskService =
  new RiskService();