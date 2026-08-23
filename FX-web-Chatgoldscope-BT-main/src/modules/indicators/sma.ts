import type {
  Candle,
  SmaResult,
} from "./indicator.types.js";
import {
  getClosingPrices,
  roundIndicatorValue,
} from "./candle.utils.js";

function validateSmaPeriod(period: number): void {
  if (
    !Number.isInteger(period) ||
    period <= 0
  ) {
    throw new Error(
      "SMA period must be a positive integer.",
    );
  }
}

export function calculateSmaSeries(
  candles: readonly Candle[],
  period: number,
): Array<number | null> {
  validateSmaPeriod(period);

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

  let rollingSum = 0;

  for (
    let index = 0;
    index < closingPrices.length;
    index += 1
  ) {
    const currentPrice =
      closingPrices[index];

    if (currentPrice === undefined) {
      throw new Error(
        "SMA calculation encountered missing closing-price data.",
      );
    }

    rollingSum += currentPrice;

    if (index >= period) {
      const expiredPrice =
        closingPrices[index - period];

      if (expiredPrice === undefined) {
        throw new Error(
          "SMA calculation encountered missing historical price data.",
        );
      }

      rollingSum -= expiredPrice;
    }

    if (index >= period - 1) {
      result[index] =
        roundIndicatorValue(
          rollingSum / period,
        );
    }
  }

  return result;
}

export function calculateSma(
  candles: readonly Candle[],
  period: number,
): SmaResult {
  const series = calculateSmaSeries(
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