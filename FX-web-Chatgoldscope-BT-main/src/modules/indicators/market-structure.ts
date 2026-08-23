import type {
  Candle,
  MarketStructureResult,
  SwingPoint,
} from "./indicator.types.js";
import { calculateAtr } from "./atr.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";
import { detectSwingPoints } from "./swing-points.js";
import { calculateSupportResistance } from "./support-resistance.js";

type StructureLabel =
  | "HH"
  | "HL"
  | "LH"
  | "LL"
  | "EH"
  | "EL";

export interface ClassifiedSwingPoint
  extends SwingPoint {
  label: StructureLabel;
}

export interface DetailedMarketStructureResult
  extends MarketStructureResult {
  latestSwingHigh: SwingPoint | null;
  latestSwingLow: SwingPoint | null;
  classifiedSwings: ClassifiedSwingPoint[];
  structureLabel:
    | "HH_HL"
    | "LH_LL"
    | "MIXED"
    | "INSUFFICIENT_DATA";
}

const DEFAULT_ATR_PERIOD = 14;
const DEFAULT_EQUALITY_TOLERANCE_PERCENT = 0.05;
const DEFAULT_VOLATILITY_LOOKBACK = 100;

function validateTolerance(
  tolerancePercent: number,
): void {
  if (
    !Number.isFinite(tolerancePercent) ||
    tolerancePercent < 0 ||
    tolerancePercent > 5
  ) {
    throw new Error(
      "Market-structure equality tolerance must be between 0 and 5 percent.",
    );
  }
}

function isApproximatelyEqual(
  firstValue: number,
  secondValue: number,
  tolerancePercent: number,
): boolean {
  if (secondValue === 0) {
    return firstValue === 0;
  }

  const distancePercent =
    (Math.abs(firstValue - secondValue) /
      Math.abs(secondValue)) *
    100;

  return distancePercent <= tolerancePercent;
}

function classifyHigh(
  current: SwingPoint,
  previous: SwingPoint,
  tolerancePercent: number,
): StructureLabel {
  if (
    isApproximatelyEqual(
      current.price,
      previous.price,
      tolerancePercent,
    )
  ) {
    return "EH";
  }

  return current.price > previous.price
    ? "HH"
    : "LH";
}

function classifyLow(
  current: SwingPoint,
  previous: SwingPoint,
  tolerancePercent: number,
): StructureLabel {
  if (
    isApproximatelyEqual(
      current.price,
      previous.price,
      tolerancePercent,
    )
  ) {
    return "EL";
  }

  return current.price > previous.price
    ? "HL"
    : "LL";
}

function classifySwingPoints(
  swingPoints: readonly SwingPoint[],
  tolerancePercent: number,
): ClassifiedSwingPoint[] {
  const classified: ClassifiedSwingPoint[] = [];

  let previousHigh: SwingPoint | null = null;
  let previousLow: SwingPoint | null = null;

  for (const swingPoint of swingPoints) {
    if (swingPoint.type === "SWING_HIGH") {
      if (previousHigh) {
        classified.push({
          ...swingPoint,
          label: classifyHigh(
            swingPoint,
            previousHigh,
            tolerancePercent,
          ),
        });
      }

      previousHigh = swingPoint;
      continue;
    }

    if (previousLow) {
      classified.push({
        ...swingPoint,
        label: classifyLow(
          swingPoint,
          previousLow,
          tolerancePercent,
        ),
      });
    }

    previousLow = swingPoint;
  }

  return classified;
}

function getLatestSwing(
  swingPoints: readonly SwingPoint[],
  type: SwingPoint["type"],
): SwingPoint | null {
  for (
    let index = swingPoints.length - 1;
    index >= 0;
    index -= 1
  ) {
    const point = swingPoints[index];

    if (point?.type === type) {
      return point;
    }
  }

  return null;
}

function determineTrend(
  classifiedSwings: readonly ClassifiedSwingPoint[],
): MarketStructureResult["trend"] {
  if (classifiedSwings.length < 2) {
    return "INSUFFICIENT_DATA";
  }

  const recentSwings =
    classifiedSwings.slice(-6);

  let bullishSignals = 0;
  let bearishSignals = 0;
  let neutralSignals = 0;

  for (const swing of recentSwings) {
    if (
      swing.label === "HH" ||
      swing.label === "HL"
    ) {
      bullishSignals += 1;
    } else if (
      swing.label === "LH" ||
      swing.label === "LL"
    ) {
      bearishSignals += 1;
    } else {
      neutralSignals += 1;
    }
  }

  if (
    bullishSignals >= 3 &&
    bullishSignals >
      bearishSignals + neutralSignals
  ) {
    return "BULLISH";
  }

  if (
    bearishSignals >= 3 &&
    bearishSignals >
      bullishSignals + neutralSignals
  ) {
    return "BEARISH";
  }

  return "RANGING";
}

function determineStructureLabel(
  classifiedSwings: readonly ClassifiedSwingPoint[],
): DetailedMarketStructureResult["structureLabel"] {
  if (classifiedSwings.length < 2) {
    return "INSUFFICIENT_DATA";
  }

  const recentLabels = classifiedSwings
    .slice(-4)
    .map((swing) => swing.label);

  const hasHigherHigh =
    recentLabels.includes("HH");

  const hasHigherLow =
    recentLabels.includes("HL");

  const hasLowerHigh =
    recentLabels.includes("LH");

  const hasLowerLow =
    recentLabels.includes("LL");

  if (hasHigherHigh && hasHigherLow) {
    return "HH_HL";
  }

  if (hasLowerHigh && hasLowerLow) {
    return "LH_LL";
  }

  return "MIXED";
}

function calculateVolatilityPercent(
  candles: readonly Candle[],
  atrPeriod: number,
): number | null {
  const latestCandle =
    candles[candles.length - 1];

  if (!latestCandle) {
    return null;
  }

  const atr = calculateAtr(
    candles,
    atrPeriod,
  ).value;

  if (
    atr === null ||
    latestCandle.close === 0
  ) {
    return null;
  }

  return (
    atr /
    latestCandle.close
  ) * 100;
}

function determineVolatility(
  candles: readonly Candle[],
  atrPeriod: number,
): MarketStructureResult["volatility"] {
  if (
    candles.length <
    atrPeriod + 1
  ) {
    return "INSUFFICIENT_DATA";
  }

  const latestVolatility =
    calculateVolatilityPercent(
      candles,
      atrPeriod,
    );

  if (latestVolatility === null) {
    return "INSUFFICIENT_DATA";
  }

  const lookbackCandles =
    candles.slice(
      -Math.min(
        DEFAULT_VOLATILITY_LOOKBACK,
        candles.length,
      ),
    );

  const historicalVolatilityValues: number[] = [];

  for (
    let endIndex = atrPeriod;
    endIndex < lookbackCandles.length;
    endIndex += 1
  ) {
    const window =
      lookbackCandles.slice(
        0,
        endIndex + 1,
      );

    const value =
      calculateVolatilityPercent(
        window,
        atrPeriod,
      );

    if (value !== null) {
      historicalVolatilityValues.push(
        value,
      );
    }
  }

  if (
    historicalVolatilityValues.length <
    10
  ) {
    return "NORMAL";
  }

  const averageVolatility =
    historicalVolatilityValues.reduce(
      (total, value) =>
        total + value,
      0,
    ) /
    historicalVolatilityValues.length;

  if (
    latestVolatility <
    averageVolatility * 0.75
  ) {
    return "LOW";
  }

  if (
    latestVolatility >
    averageVolatility * 1.35
  ) {
    return "HIGH";
  }

  return "NORMAL";
}

export function calculateMarketStructure(
  candles: readonly Candle[],
  options?: {
    leftBars?: number;
    rightBars?: number;
    atrPeriod?: number;
    equalityTolerancePercent?: number;
    maxLevels?: number;
    levelTolerancePercent?: number;
  },
): DetailedMarketStructureResult {
  validateCandles(candles);

  const leftBars =
    options?.leftBars ?? 3;

  const rightBars =
    options?.rightBars ?? 3;

  const atrPeriod =
    options?.atrPeriod ??
    DEFAULT_ATR_PERIOD;

  const equalityTolerancePercent =
    options?.equalityTolerancePercent ??
    DEFAULT_EQUALITY_TOLERANCE_PERCENT;

  validateTolerance(
    equalityTolerancePercent,
  );

  const swingPoints =
    detectSwingPoints(
      candles,
      leftBars,
      rightBars,
    );

  const classifiedSwings =
    classifySwingPoints(
      swingPoints,
      equalityTolerancePercent,
    );

  const supportResistanceOptions: {
  leftBars: number;
  rightBars: number;
  maxLevels?: number;
  tolerancePercent?: number;
} = {
  leftBars,
  rightBars,
};

if (options?.maxLevels !== undefined) {
  supportResistanceOptions.maxLevels =
    options.maxLevels;
}

if (
  options?.levelTolerancePercent !==
  undefined
) {
  supportResistanceOptions.tolerancePercent =
    options.levelTolerancePercent;
}

const levels =
  calculateSupportResistance(
    candles,
    supportResistanceOptions,
  );

  return {
    trend: determineTrend(
      classifiedSwings,
    ),

    volatility:
      determineVolatility(
        candles,
        atrPeriod,
      ),

    supports: levels.supports,
    resistances:
      levels.resistances,

    latestSwingHigh:
      getLatestSwing(
        swingPoints,
        "SWING_HIGH",
      ),

    latestSwingLow:
      getLatestSwing(
        swingPoints,
        "SWING_LOW",
      ),

    classifiedSwings,
    structureLabel:
      determineStructureLabel(
        classifiedSwings,
      ),
  };
}

export function getStructureSummary(
  structure: DetailedMarketStructureResult,
): string {
  const latestHigh =
    structure.latestSwingHigh?.price;

  const latestLow =
    structure.latestSwingLow?.price;

  const highText =
    latestHigh === undefined
      ? "unavailable"
      : roundIndicatorValue(
          latestHigh,
        ).toString();

  const lowText =
    latestLow === undefined
      ? "unavailable"
      : roundIndicatorValue(
          latestLow,
        ).toString();

  return [
    `Trend: ${structure.trend}`,
    `Structure: ${structure.structureLabel}`,
    `Volatility: ${structure.volatility}`,
    `Latest swing high: ${highText}`,
    `Latest swing low: ${lowText}`,
  ].join(". ");
}