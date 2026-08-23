import type {
  Candle,
  EmaResult,
} from "./indicator.types.js";
import {
  getClosingPrices,
  roundIndicatorValue,
} from "./candle.utils.js";

function validateEmaPeriod(period: number): void {
  if (
    !Number.isInteger(period) ||
    period <= 0
  ) {
    throw new Error(
      "EMA period must be a positive integer.",
    );
  }
}

export function calculateEmaSeries(
  candles: readonly Candle[],
  period: number,
): Array<number | null> {
  validateEmaPeriod(period);

  const closingPrices =
    getClosingPrices(candles);

  const result: Array<number | null> =
    Array.from(
      {
        length: closingPrices.length,
      },
      () => null,
    );

  if (closingPrices.length < period) {
    return result;
  }

  const initialPrices =
    closingPrices.slice(0, period);

  const initialSma =
    initialPrices.reduce(
      (total, price) => total + price,
      0,
    ) / period;

  const firstEmaIndex = period - 1;

  result[firstEmaIndex] =
    roundIndicatorValue(initialSma);

  const multiplier =
    2 / (period + 1);

  let previousEma = initialSma;

  for (
    let index = period;
    index < closingPrices.length;
    index += 1
  ) {
    const closingPrice =
      closingPrices[index];

    if (closingPrice === undefined) {
      throw new Error(
        "EMA calculation encountered missing closing-price data.",
      );
    }

    const currentEma =
      (closingPrice - previousEma) *
        multiplier +
      previousEma;

    result[index] =
      roundIndicatorValue(currentEma);

    previousEma = currentEma;
  }

  return result;
}

export function calculateEma(
  candles: readonly Candle[],
  period: number,
): EmaResult {
  const series = calculateEmaSeries(
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