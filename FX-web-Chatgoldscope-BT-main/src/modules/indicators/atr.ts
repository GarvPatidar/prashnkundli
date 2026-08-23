import type {
  AtrResult,
  Candle,
} from "./indicator.types.js";
import {
  getTrueRanges,
  roundIndicatorValue,
} from "./candle.utils.js";

function validateAtrPeriod(period: number): void {
  if (
    !Number.isInteger(period) ||
    period <= 0
  ) {
    throw new Error(
      "ATR period must be a positive integer.",
    );
  }
}

export function calculateAtrSeries(
  candles: readonly Candle[],
  period: number,
): Array<number | null> {
  validateAtrPeriod(period);

  const trueRanges = getTrueRanges(candles);

  const result: Array<number | null> =
    Array.from(
      {
        length: trueRanges.length,
      },
      () => null,
    );

  if (trueRanges.length < period) {
    return result;
  }

  const initialTrueRanges =
    trueRanges.slice(0, period);

  const initialAtr =
    initialTrueRanges.reduce(
      (total, trueRange) =>
        total + trueRange,
      0,
    ) / period;

  const firstAtrIndex = period - 1;

  result[firstAtrIndex] =
    roundIndicatorValue(initialAtr);

  let previousAtr = initialAtr;

  for (
    let index = period;
    index < trueRanges.length;
    index += 1
  ) {
    const currentTrueRange =
      trueRanges[index];

    if (currentTrueRange === undefined) {
      throw new Error(
        "ATR calculation encountered missing true-range data.",
      );
    }

    const currentAtr =
      (
        previousAtr *
          (period - 1) +
        currentTrueRange
      ) / period;

    result[index] =
      roundIndicatorValue(currentAtr);

    previousAtr = currentAtr;
  }

  return result;
}

export function calculateAtr(
  candles: readonly Candle[],
  period: number,
): AtrResult {
  const series = calculateAtrSeries(
    candles,
    period,
  );

  const latestValue =
    series.length > 0
      ? series[series.length - 1] ?? null
      : null;

  return {
    period,
    value: latestValue,
  };
}