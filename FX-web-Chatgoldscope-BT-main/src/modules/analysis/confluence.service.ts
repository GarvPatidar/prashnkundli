import type { CompleteIndicatorSnapshot } from "../indicators/indicator.service.js";
import type {
  MultiTimeframeSnapshots,
} from "./multi-timeframe.service.js";

export type MarketDirection =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export type FinalMarketBias =
  | "STRONG_BULLISH"
  | "BULLISH"
  | "CAUTIOUS_BULLISH"
  | "NEUTRAL"
  | "CAUTIOUS_BEARISH"
  | "BEARISH"
  | "STRONG_BEARISH";

export interface TimeframeConfluence {
  timeframe: keyof MultiTimeframeSnapshots;
  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
  netScore: number;
  direction: MarketDirection;
  signals: string[];
  warnings: string[];
}

export interface MultiTimeframeAgreement {
  bullishTimeframes: Array<
    keyof MultiTimeframeSnapshots
  >;

  bearishTimeframes: Array<
    keyof MultiTimeframeSnapshots
  >;

  neutralTimeframes: Array<
    keyof MultiTimeframeSnapshots
  >;

  primaryAndHigherTimeframesAgree: boolean;
  agreementScore: number;
}

export interface ConfluenceResult {
  finalBias: FinalMarketBias;
  direction: MarketDirection;

  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
  netScore: number;
  confidence: number;

  timeframes: Record<
    keyof MultiTimeframeSnapshots,
    TimeframeConfluence
  >;

  agreement: MultiTimeframeAgreement;

  conflicts: string[];
  warnings: string[];
  strongestSignals: string[];

  generatedAt: string;
}

interface MutableScore {
  bullish: number;
  bearish: number;
  neutral: number;
  signals: string[];
  warnings: string[];
}

const TIMEFRAME_WEIGHTS: Record<
  keyof MultiTimeframeSnapshots,
  number
> = {
  M15: 0.35,
  H1: 0.30,
  H4: 0.25,
  D1: 0.10,
};

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

function roundScore(value: number): number {
  return Number(value.toFixed(2));
}

function addBullishSignal(
  score: MutableScore,
  points: number,
  message: string,
): void {
  score.bullish += points;
  score.signals.push(message);
}

function addBearishSignal(
  score: MutableScore,
  points: number,
  message: string,
): void {
  score.bearish += points;
  score.signals.push(message);
}

function addNeutralSignal(
  score: MutableScore,
  points: number,
  message: string,
): void {
  score.neutral += points;
  score.signals.push(message);
}

function scoreMarketStructure(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  switch (snapshot.structure.trend) {
    case "BULLISH":
      addBullishSignal(
        score,
        22,
        `${snapshot.timeframe}: market structure is bullish.`,
      );
      break;

    case "BEARISH":
      addBearishSignal(
        score,
        22,
        `${snapshot.timeframe}: market structure is bearish.`,
      );
      break;

    case "RANGING":
      addNeutralSignal(
        score,
        18,
        `${snapshot.timeframe}: market structure is ranging.`,
      );
      break;

    case "INSUFFICIENT_DATA":
      score.warnings.push(
        `${snapshot.timeframe}: insufficient swing data for market structure.`,
      );
      break;
  }
}

function scoreEmaAlignment(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const ema20 = snapshot.ema20.value;
  const ema50 = snapshot.ema50.value;
  const ema200 = snapshot.ema200.value;

  if (
    ema20 === null ||
    ema50 === null
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: EMA alignment is unavailable.`,
    );

    return;
  }

  if (
    ema200 !== null &&
    ema20 > ema50 &&
    ema50 > ema200
  ) {
    addBullishSignal(
      score,
      18,
      `${snapshot.timeframe}: EMA 20 > EMA 50 > EMA 200.`,
    );

    return;
  }

  if (
    ema200 !== null &&
    ema20 < ema50 &&
    ema50 < ema200
  ) {
    addBearishSignal(
      score,
      18,
      `${snapshot.timeframe}: EMA 20 < EMA 50 < EMA 200.`,
    );

    return;
  }

  if (ema20 > ema50) {
    addBullishSignal(
      score,
      10,
      `${snapshot.timeframe}: EMA 20 is above EMA 50.`,
    );
  } else if (ema20 < ema50) {
    addBearishSignal(
      score,
      10,
      `${snapshot.timeframe}: EMA 20 is below EMA 50.`,
    );
  } else {
    addNeutralSignal(
      score,
      6,
      `${snapshot.timeframe}: EMA 20 and EMA 50 are flat.`,
    );
  }
}

function scoreSmaAlignment(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const sma21 = snapshot.sma21.value;
  const sma44 = snapshot.sma44.value;

  if (
    sma21 === null ||
    sma44 === null
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: SMA 21/44 confirmation is unavailable.`,
    );

    return;
  }

  const distancePercent =
    Math.abs(sma21 - sma44) /
    Math.max(Math.abs(sma44), 1) *
    100;

  if (distancePercent < 0.03) {
    addNeutralSignal(
      score,
      6,
      `${snapshot.timeframe}: SMA 21 and SMA 44 are compressed.`,
    );

    return;
  }

  if (sma21 > sma44) {
    addBullishSignal(
      score,
      8,
      `${snapshot.timeframe}: SMA 21 is above SMA 44.`,
    );
  } else {
    addBearishSignal(
      score,
      8,
      `${snapshot.timeframe}: SMA 21 is below SMA 44.`,
    );
  }
}

function scoreRsi(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const rsi = snapshot.rsi14.value;

  if (rsi === null) {
    score.warnings.push(
      `${snapshot.timeframe}: RSI is unavailable.`,
    );

    return;
  }

  if (rsi >= 55 && rsi < 70) {
    addBullishSignal(
      score,
      8,
      `${snapshot.timeframe}: RSI supports bullish momentum.`,
    );
  } else if (rsi > 30 && rsi <= 45) {
    addBearishSignal(
      score,
      8,
      `${snapshot.timeframe}: RSI supports bearish momentum.`,
    );
  } else if (rsi >= 70) {
    addBullishSignal(
      score,
      3,
      `${snapshot.timeframe}: RSI momentum is bullish but overbought.`,
    );

    score.warnings.push(
      `${snapshot.timeframe}: RSI is overbought; pullback risk is elevated.`,
    );
  } else if (rsi <= 30) {
    addBearishSignal(
      score,
      3,
      `${snapshot.timeframe}: RSI momentum is bearish but oversold.`,
    );

    score.warnings.push(
      `${snapshot.timeframe}: RSI is oversold; reversal risk is elevated.`,
    );
  } else {
    addNeutralSignal(
      score,
      5,
      `${snapshot.timeframe}: RSI is neutral.`,
    );
  }
}

function scoreMacd(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const {
    macd,
    signal,
    histogram,
  } = snapshot.macd;

  if (
    macd === null ||
    signal === null ||
    histogram === null
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: MACD is unavailable.`,
    );

    return;
  }

  if (
    macd > signal &&
    histogram > 0
  ) {
    addBullishSignal(
      score,
      10,
      `${snapshot.timeframe}: MACD momentum is bullish.`,
    );
  } else if (
    macd < signal &&
    histogram < 0
  ) {
    addBearishSignal(
      score,
      10,
      `${snapshot.timeframe}: MACD momentum is bearish.`,
    );
  } else {
    addNeutralSignal(
      score,
      5,
      `${snapshot.timeframe}: MACD momentum is mixed.`,
    );
  }
}

function scoreStochastic(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const percentK =
    snapshot.stochastic.percentK;

  const percentD =
    snapshot.stochastic.percentD;

  if (
    percentK === null ||
    percentD === null
  ) {
    return;
  }

  if (
    percentK > percentD &&
    percentK < 80
  ) {
    addBullishSignal(
      score,
      5,
      `${snapshot.timeframe}: Stochastic momentum is rising.`,
    );
  } else if (
    percentK < percentD &&
    percentK > 20
  ) {
    addBearishSignal(
      score,
      5,
      `${snapshot.timeframe}: Stochastic momentum is falling.`,
    );
  }

  if (
    percentK >= 80 &&
    percentD >= 80
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: Stochastic is overbought.`,
    );
  }

  if (
    percentK <= 20 &&
    percentD <= 20
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: Stochastic is oversold.`,
    );
  }
}

function scoreAdx(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const {
    adx,
    plusDi,
    minusDi,
  } = snapshot.adx14;

  if (
    adx === null ||
    plusDi === null ||
    minusDi === null
  ) {
    return;
  }

  if (adx < 20) {
    addNeutralSignal(
      score,
      8,
      `${snapshot.timeframe}: ADX shows a weak trend.`,
    );

    return;
  }

  const trendPoints =
    adx >= 25 ? 10 : 6;

  if (plusDi > minusDi) {
    addBullishSignal(
      score,
      trendPoints,
      `${snapshot.timeframe}: ADX directional strength favours buyers.`,
    );
  } else if (minusDi > plusDi) {
    addBearishSignal(
      score,
      trendPoints,
      `${snapshot.timeframe}: ADX directional strength favours sellers.`,
    );
  }
}

function scorePriceLocation(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  const currentPrice =
    snapshot.metadata.latestClose;

  const vwap =
    snapshot.vwap.value;

  if (vwap !== null) {
    if (currentPrice > vwap) {
      addBullishSignal(
        score,
        5,
        `${snapshot.timeframe}: price is above VWAP.`,
      );
    } else if (currentPrice < vwap) {
      addBearishSignal(
        score,
        5,
        `${snapshot.timeframe}: price is below VWAP.`,
      );
    }
  }

  const middleBand =
    snapshot.bollingerBands.middle;

  if (middleBand !== null) {
    if (currentPrice > middleBand) {
      addBullishSignal(
        score,
        4,
        `${snapshot.timeframe}: price is above the Bollinger middle band.`,
      );
    } else if (currentPrice < middleBand) {
      addBearishSignal(
        score,
        4,
        `${snapshot.timeframe}: price is below the Bollinger middle band.`,
      );
    }
  }
}

function addVolatilityWarning(
  snapshot: CompleteIndicatorSnapshot,
  score: MutableScore,
): void {
  if (
    snapshot.structure.volatility ===
    "HIGH"
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: volatility is elevated.`,
    );
  }

  if (
    snapshot.structure.volatility ===
    "LOW"
  ) {
    score.warnings.push(
      `${snapshot.timeframe}: volatility is compressed; breakout risk may be building.`,
    );
  }
}

function getDirection(
  bullishScore: number,
  bearishScore: number,
): MarketDirection {
  const difference =
    bullishScore - bearishScore;

  if (difference >= 10) {
    return "BULLISH";
  }

  if (difference <= -10) {
    return "BEARISH";
  }

  return "NEUTRAL";
}

function calculateTimeframeConfluence(
  timeframe: keyof MultiTimeframeSnapshots,
  snapshot: CompleteIndicatorSnapshot,
): TimeframeConfluence {
  const score: MutableScore = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
    signals: [],
    warnings: [],
  };

  scoreMarketStructure(snapshot, score);
  scoreEmaAlignment(snapshot, score);
  scoreSmaAlignment(snapshot, score);
  scoreRsi(snapshot, score);
  scoreMacd(snapshot, score);
  scoreStochastic(snapshot, score);
  scoreAdx(snapshot, score);
  scorePriceLocation(snapshot, score);
  addVolatilityWarning(snapshot, score);

  const total =
    score.bullish +
    score.bearish +
    score.neutral;

  const divisor =
    total > 0 ? total : 1;

  const bullishScore =
    score.bullish /
    divisor *
    100;

  const bearishScore =
    score.bearish /
    divisor *
    100;

  const neutralScore =
    score.neutral /
    divisor *
    100;

  const netScore =
    bullishScore -
    bearishScore;

  return {
    timeframe,
    bullishScore:
      roundScore(bullishScore),
    bearishScore:
      roundScore(bearishScore),
    neutralScore:
      roundScore(neutralScore),
    netScore:
      roundScore(netScore),
    direction: getDirection(
      bullishScore,
      bearishScore,
    ),
    signals: score.signals,
    warnings: score.warnings,
  };
}

function calculateAgreement(
  timeframes: ConfluenceResult["timeframes"],
): MultiTimeframeAgreement {
  const entries = Object.entries(
    timeframes,
  ) as Array<
    [
      keyof MultiTimeframeSnapshots,
      TimeframeConfluence,
    ]
  >;

  const bullishTimeframes =
    entries
      .filter(
        ([, result]) =>
          result.direction === "BULLISH",
      )
      .map(([timeframe]) => timeframe);

  const bearishTimeframes =
    entries
      .filter(
        ([, result]) =>
          result.direction === "BEARISH",
      )
      .map(([timeframe]) => timeframe);

  const neutralTimeframes =
    entries
      .filter(
        ([, result]) =>
          result.direction === "NEUTRAL",
      )
      .map(([timeframe]) => timeframe);

  const m15Direction =
    timeframes.M15.direction;

  const higherDirections = [
    timeframes.H1.direction,
    timeframes.H4.direction,
    timeframes.D1.direction,
  ];

  const matchingHigherTimeframes =
    higherDirections.filter(
      (direction) =>
        direction === m15Direction &&
        direction !== "NEUTRAL",
    ).length;

  const directionalCounts = [
    bullishTimeframes.length,
    bearishTimeframes.length,
    neutralTimeframes.length,
  ];

  const highestCount =
    Math.max(...directionalCounts);

  return {
    bullishTimeframes,
    bearishTimeframes,
    neutralTimeframes,

    primaryAndHigherTimeframesAgree:
      matchingHigherTimeframes >= 2,

    agreementScore:
      roundScore(
        highestCount / 4 * 100,
      ),
  };
}

function detectConflicts(
  timeframes: ConfluenceResult["timeframes"],
): string[] {
  const conflicts: string[] = [];

  if (
    timeframes.M15.direction === "BULLISH" &&
    (
      timeframes.H4.direction === "BEARISH" ||
      timeframes.D1.direction === "BEARISH"
    )
  ) {
    conflicts.push(
      "M15 is bullish while a higher timeframe remains bearish.",
    );
  }

  if (
    timeframes.M15.direction === "BEARISH" &&
    (
      timeframes.H4.direction === "BULLISH" ||
      timeframes.D1.direction === "BULLISH"
    )
  ) {
    conflicts.push(
      "M15 is bearish while a higher timeframe remains bullish.",
    );
  }

  if (
    timeframes.M15.direction !==
    timeframes.H1.direction
  ) {
    conflicts.push(
      "M15 and H1 directional signals do not agree.",
    );
  }

  if (
    timeframes.H1.direction !==
    timeframes.H4.direction
  ) {
    conflicts.push(
      "H1 and H4 trend direction is conflicting.",
    );
  }

  return conflicts;
}

function calculateWeightedScores(
  timeframes: ConfluenceResult["timeframes"],
): {
  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
} {
  let bullishScore = 0;
  let bearishScore = 0;
  let neutralScore = 0;

  const keys = Object.keys(
    timeframes,
  ) as Array<
    keyof MultiTimeframeSnapshots
  >;

  for (const timeframe of keys) {
    const weight =
      TIMEFRAME_WEIGHTS[timeframe];

    const result =
      timeframes[timeframe];

    bullishScore +=
      result.bullishScore * weight;

    bearishScore +=
      result.bearishScore * weight;

    neutralScore +=
      result.neutralScore * weight;
  }

  return {
    bullishScore:
      roundScore(bullishScore),
    bearishScore:
      roundScore(bearishScore),
    neutralScore:
      roundScore(neutralScore),
  };
}

function getFinalBias(
  netScore: number,
  conflicts: readonly string[],
): FinalMarketBias {
  const conflictPenalty =
    conflicts.length >= 2 ? 10 : 0;

  const adjustedScore =
    netScore > 0
      ? netScore - conflictPenalty
      : netScore + conflictPenalty;

  if (adjustedScore >= 55) {
    return "STRONG_BULLISH";
  }

  if (adjustedScore >= 30) {
    return "BULLISH";
  }

  if (adjustedScore >= 12) {
    return "CAUTIOUS_BULLISH";
  }

  if (adjustedScore <= -55) {
    return "STRONG_BEARISH";
  }

  if (adjustedScore <= -30) {
    return "BEARISH";
  }

  if (adjustedScore <= -12) {
    return "CAUTIOUS_BEARISH";
  }

  return "NEUTRAL";
}

function calculateConfidence(
  netScore: number,
  agreementScore: number,
  conflicts: readonly string[],
  warnings: readonly string[],
): number {
  const directionalStrength =
    Math.min(
      100,
      Math.abs(netScore) * 1.4,
    );

  const conflictPenalty =
    conflicts.length * 10;

  const warningPenalty =
    Math.min(
      20,
      warnings.length * 2,
    );

  return Math.round(
    clamp(
      directionalStrength * 0.65 +
        agreementScore * 0.35 -
        conflictPenalty -
        warningPenalty,
      0,
      100,
    ),
  );
}

export class ConfluenceService {
  calculate(
    snapshots: MultiTimeframeSnapshots,
  ): ConfluenceResult {
    const timeframes = {
      M15: calculateTimeframeConfluence(
        "M15",
        snapshots.M15,
      ),

      H1: calculateTimeframeConfluence(
        "H1",
        snapshots.H1,
      ),

      H4: calculateTimeframeConfluence(
        "H4",
        snapshots.H4,
      ),

      D1: calculateTimeframeConfluence(
        "D1",
        snapshots.D1,
      ),
    };

    const weightedScores =
      calculateWeightedScores(timeframes);

    const netScore =
      weightedScores.bullishScore -
      weightedScores.bearishScore;

    const agreement =
      calculateAgreement(timeframes);

    const conflicts =
      detectConflicts(timeframes);

    const warnings = [
      ...new Set(
        Object.values(timeframes)
          .flatMap(
            (timeframe) =>
              timeframe.warnings,
          ),
      ),
    ];

    const strongestSignals = [
      ...new Set(
        Object.values(timeframes)
          .flatMap(
            (timeframe) =>
              timeframe.signals,
          ),
      ),
    ].slice(0, 12);

    const direction =
      getDirection(
        weightedScores.bullishScore,
        weightedScores.bearishScore,
      );

    const confidence =
      calculateConfidence(
        netScore,
        agreement.agreementScore,
        conflicts,
        warnings,
      );

    return {
      finalBias: getFinalBias(
        netScore,
        conflicts,
      ),

      direction,

      bullishScore:
        weightedScores.bullishScore,

      bearishScore:
        weightedScores.bearishScore,

      neutralScore:
        weightedScores.neutralScore,

      netScore:
        roundScore(netScore),

      confidence,

      timeframes,
      agreement,
      conflicts,
      warnings,
      strongestSignals,

      generatedAt:
        new Date().toISOString(),
    };
  }
}

export const confluenceService =
  new ConfluenceService();