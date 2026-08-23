import type {
  Candle,
  RsiResult,
} from "./indicator.types.js";
import {
  getClosingPrices,
  roundIndicatorValue,
} from "./candle.utils.js";

function validateRsiPeriod(period: number): void {
  if (
    !Number.isInteger(period) ||
    period <= 0
  ) {
    throw new Error(
      "RSI period must be a positive integer.",
    );
  }
}

function getRsiCondition(
  value: number | null,
): RsiResult["condition"] {
  if (value === null) {
    return "UNAVAILABLE";
  }

  if (value <= 30) {
    return "OVERSOLD";
  }

  if (value >= 70) {
    return "OVERBOUGHT";
  }

  return "NEUTRAL";
}

function calculateRsiValue(
  averageGain: number,
  averageLoss: number,
): number {
  if (averageLoss === 0) {
    return averageGain === 0
      ? 50
      : 100;
  }

  if (averageGain === 0) {
    return 0;
  }

  const relativeStrength =
    averageGain / averageLoss;

  return 100 -
    100 / (1 + relativeStrength);
}

export function calculateRsiSeries(
  candles: readonly Candle[],
  period: number,
): Array<number | null> {
  validateRsiPeriod(period);

  const closingPrices =
    getClosingPrices(candles);

  const result: Array<number | null> =
    Array.from(
      {
        length: closingPrices.length,
      },
      () => null,
    );

  if (
    closingPrices.length <
    period + 1
  ) {
    return result;
  }

  let totalGain = 0;
  let totalLoss = 0;

  for (
    let index = 1;
    index <= period;
    index += 1
  ) {
    const currentPrice =
      closingPrices[index];

    const previousPrice =
      closingPrices[index - 1];

    if (
      currentPrice === undefined ||
      previousPrice === undefined
    ) {
      throw new Error(
        "RSI calculation encountered missing closing-price data.",
      );
    }

    const change =
      currentPrice - previousPrice;

    if (change > 0) {
      totalGain += change;
    } else {
      totalLoss += Math.abs(change);
    }
  }

  let averageGain =
    totalGain / period;

  let averageLoss =
    totalLoss / period;

  result[period] =
    roundIndicatorValue(
      calculateRsiValue(
        averageGain,
        averageLoss,
      ),
    );

  for (
    let index = period + 1;
    index < closingPrices.length;
    index += 1
  ) {
    const currentPrice =
      closingPrices[index];

    const previousPrice =
      closingPrices[index - 1];

    if (
      currentPrice === undefined ||
      previousPrice === undefined
    ) {
      throw new Error(
        "RSI calculation encountered missing closing-price data.",
      );
    }

    const change =
      currentPrice - previousPrice;

    const gain =
      change > 0 ? change : 0;

    const loss =
      change < 0
        ? Math.abs(change)
        : 0;

    averageGain =
      (
        averageGain *
          (period - 1) +
        gain
      ) / period;

    averageLoss =
      (
        averageLoss *
          (period - 1) +
        loss
      ) / period;

    result[index] =
      roundIndicatorValue(
        calculateRsiValue(
          averageGain,
          averageLoss,
        ),
      );
  }

  return result;
}

export function calculateRsi(
  candles: readonly Candle[],
  period: number,
): RsiResult {
  const series = calculateRsiSeries(
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
    condition:
      getRsiCondition(latestValue),
  };
}