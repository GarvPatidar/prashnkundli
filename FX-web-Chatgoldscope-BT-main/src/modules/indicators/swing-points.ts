import type {
  Candle,
  SwingPoint,
} from "./indicator.types.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";

const DEFAULT_LEFT_BARS = 3;
const DEFAULT_RIGHT_BARS = 3;

function validateSwingWindow(
  leftBars: number,
  rightBars: number,
): void {
  if (
    !Number.isInteger(leftBars) ||
    leftBars < 1
  ) {
    throw new Error(
      "Swing left-bars value must be a positive integer.",
    );
  }

  if (
    !Number.isInteger(rightBars) ||
    rightBars < 1
  ) {
    throw new Error(
      "Swing right-bars value must be a positive integer.",
    );
  }
}

function calculateSwingStrength(
  centerPrice: number,
  surroundingPrices: readonly number[],
): number {
  if (surroundingPrices.length === 0) {
    return 0;
  }

  const averageDistance =
    surroundingPrices.reduce(
      (total, price) =>
        total +
        Math.abs(centerPrice - price),
      0,
    ) / surroundingPrices.length;

  if (centerPrice === 0) {
    return 0;
  }

  const percentageDistance =
    (averageDistance / centerPrice) * 100;

  /*
   * Convert the relative price separation into a
   * normalized score between 0 and 100.
   */
  return Math.min(
    100,
    roundIndicatorValue(
      percentageDistance * 20,
      2,
    ),
  );
}

function isSwingHigh(
  candles: readonly Candle[],
  index: number,
  leftBars: number,
  rightBars: number,
): boolean {
  const centerCandle = candles[index];

  if (!centerCandle) {
    return false;
  }

  for (
    let offset = 1;
    offset <= leftBars;
    offset += 1
  ) {
    const leftCandle =
      candles[index - offset];

    if (
      !leftCandle ||
      centerCandle.high <= leftCandle.high
    ) {
      return false;
    }
  }

  for (
    let offset = 1;
    offset <= rightBars;
    offset += 1
  ) {
    const rightCandle =
      candles[index + offset];

    if (
      !rightCandle ||
      centerCandle.high < rightCandle.high
    ) {
      return false;
    }
  }

  return true;
}

function isSwingLow(
  candles: readonly Candle[],
  index: number,
  leftBars: number,
  rightBars: number,
): boolean {
  const centerCandle = candles[index];

  if (!centerCandle) {
    return false;
  }

  for (
    let offset = 1;
    offset <= leftBars;
    offset += 1
  ) {
    const leftCandle =
      candles[index - offset];

    if (
      !leftCandle ||
      centerCandle.low >= leftCandle.low
    ) {
      return false;
    }
  }

  for (
    let offset = 1;
    offset <= rightBars;
    offset += 1
  ) {
    const rightCandle =
      candles[index + offset];

    if (
      !rightCandle ||
      centerCandle.low > rightCandle.low
    ) {
      return false;
    }
  }

  return true;
}

function getSurroundingHighs(
  candles: readonly Candle[],
  index: number,
  leftBars: number,
  rightBars: number,
): number[] {
  return candles
    .slice(
      index - leftBars,
      index + rightBars + 1,
    )
    .filter(
      (_, relativeIndex) =>
        relativeIndex !== leftBars,
    )
    .map((candle) => candle.high);
}

function getSurroundingLows(
  candles: readonly Candle[],
  index: number,
  leftBars: number,
  rightBars: number,
): number[] {
  return candles
    .slice(
      index - leftBars,
      index + rightBars + 1,
    )
    .filter(
      (_, relativeIndex) =>
        relativeIndex !== leftBars,
    )
    .map((candle) => candle.low);
}

export function detectSwingPoints(
  candles: readonly Candle[],
  leftBars = DEFAULT_LEFT_BARS,
  rightBars = DEFAULT_RIGHT_BARS,
): SwingPoint[] {
  validateSwingWindow(
    leftBars,
    rightBars,
  );

  validateCandles(candles);

  const requiredCandleCount =
    leftBars + rightBars + 1;

  if (
    candles.length <
    requiredCandleCount
  ) {
    return [];
  }

  const swingPoints: SwingPoint[] = [];

  for (
    let index = leftBars;
    index <
    candles.length - rightBars;
    index += 1
  ) {
    const candle = candles[index];

    if (!candle) {
      throw new Error(
        "Swing detection encountered missing candle data.",
      );
    }

    if (
      isSwingHigh(
        candles,
        index,
        leftBars,
        rightBars,
      )
    ) {
      swingPoints.push({
        type: "SWING_HIGH",
        index,
        timestamp: candle.timestamp,
        price: roundIndicatorValue(
          candle.high,
        ),
        strength:
          calculateSwingStrength(
            candle.high,
            getSurroundingHighs(
              candles,
              index,
              leftBars,
              rightBars,
            ),
          ),
      });
    }

    if (
      isSwingLow(
        candles,
        index,
        leftBars,
        rightBars,
      )
    ) {
      swingPoints.push({
        type: "SWING_LOW",
        index,
        timestamp: candle.timestamp,
        price: roundIndicatorValue(
          candle.low,
        ),
        strength:
          calculateSwingStrength(
            candle.low,
            getSurroundingLows(
              candles,
              index,
              leftBars,
              rightBars,
            ),
          ),
      });
    }
  }

  return swingPoints.sort(
    (firstPoint, secondPoint) =>
      firstPoint.index -
      secondPoint.index,
  );
}

export function getLatestSwingHigh(
  swingPoints: readonly SwingPoint[],
): SwingPoint | null {
  for (
    let index =
      swingPoints.length - 1;
    index >= 0;
    index -= 1
  ) {
    const swingPoint =
      swingPoints[index];

    if (
      swingPoint?.type ===
      "SWING_HIGH"
    ) {
      return swingPoint;
    }
  }

  return null;
}

export function getLatestSwingLow(
  swingPoints: readonly SwingPoint[],
): SwingPoint | null {
  for (
    let index =
      swingPoints.length - 1;
    index >= 0;
    index -= 1
  ) {
    const swingPoint =
      swingPoints[index];

    if (
      swingPoint?.type ===
      "SWING_LOW"
    ) {
      return swingPoint;
    }
  }

  return null;
}