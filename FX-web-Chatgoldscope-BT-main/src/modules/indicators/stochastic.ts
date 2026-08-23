import type {
  Candle,
  StochasticResult,
} from "./indicator.types.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";

const DEFAULT_K_PERIOD = 14;
const DEFAULT_D_PERIOD = 3;
const DEFAULT_SMOOTH_K_PERIOD = 3;

export interface StochasticSeriesPoint {
  percentK: number | null;
  percentD: number | null;
}

function validatePeriods(
  kPeriod: number,
  dPeriod: number,
  smoothKPeriod: number,
): void {
  const periods = [
    kPeriod,
    dPeriod,
    smoothKPeriod,
  ];

  if (
    periods.some(
      (period) =>
        !Number.isInteger(period) ||
        period <= 0,
    )
  ) {
    throw new Error(
      "Stochastic periods must be positive integers.",
    );
  }
}

function calculateSimpleMovingAverageSeries(
  values: readonly (number | null)[],
  period: number,
): Array<number | null> {
  const result: Array<number | null> =
    Array.from(
      {
        length: values.length,
      },
      () => null,
    );

  for (
    let index = period - 1;
    index < values.length;
    index += 1
  ) {
    const window =
      values.slice(
        index - period + 1,
        index + 1,
      );

    if (
      window.length !== period ||
      window.some(
        (value) => value === null,
      )
    ) {
      continue;
    }

    const numericWindow =
      window as number[];

    const average =
      numericWindow.reduce(
        (total, value) =>
          total + value,
        0,
      ) / period;

    result[index] = average;
  }

  return result;
}

function getCondition(
  percentK: number | null,
  percentD: number | null,
): StochasticResult["condition"] {
  if (
    percentK === null ||
    percentD === null
  ) {
    return "UNAVAILABLE";
  }

  if (
    percentK <= 20 &&
    percentD <= 20
  ) {
    return "OVERSOLD";
  }

  if (
    percentK >= 80 &&
    percentD >= 80
  ) {
    return "OVERBOUGHT";
  }

  return "NEUTRAL";
}

export function calculateStochasticSeries(
  candles: readonly Candle[],
  kPeriod = DEFAULT_K_PERIOD,
  dPeriod = DEFAULT_D_PERIOD,
  smoothKPeriod =
    DEFAULT_SMOOTH_K_PERIOD,
): StochasticSeriesPoint[] {
  validatePeriods(
    kPeriod,
    dPeriod,
    smoothKPeriod,
  );

  validateCandles(candles);

  const rawKSeries: Array<number | null> =
    Array.from(
      {
        length: candles.length,
      },
      () => null,
    );

  if (candles.length < kPeriod) {
    return candles.map(() => ({
      percentK: null,
      percentD: null,
    }));
  }

  for (
    let index = kPeriod - 1;
    index < candles.length;
    index += 1
  ) {
    const window =
      candles.slice(
        index - kPeriod + 1,
        index + 1,
      );

    const currentCandle =
      candles[index];

    if (!currentCandle) {
      throw new Error(
        "Stochastic calculation encountered missing candle data.",
      );
    }

    const highestHigh =
      Math.max(
        ...window.map(
          (candle) => candle.high,
        ),
      );

    const lowestLow =
      Math.min(
        ...window.map(
          (candle) => candle.low,
        ),
      );

    const priceRange =
      highestHigh - lowestLow;

    if (priceRange === 0) {
      rawKSeries[index] = 50;
      continue;
    }

    rawKSeries[index] =
      (
        (
          currentCandle.close -
          lowestLow
        ) /
        priceRange
      ) * 100;
  }

  const smoothedKSeries =
    calculateSimpleMovingAverageSeries(
      rawKSeries,
      smoothKPeriod,
    );

  const dSeries =
    calculateSimpleMovingAverageSeries(
      smoothedKSeries,
      dPeriod,
    );

  return candles.map(
    (_, index) => {
      const percentK =
        smoothedKSeries[index];

      const percentD =
        dSeries[index];

      return {
        percentK:
          percentK === null ||
          percentK === undefined
            ? null
            : roundIndicatorValue(
                percentK,
              ),

        percentD:
          percentD === null ||
          percentD === undefined
            ? null
            : roundIndicatorValue(
                percentD,
              ),
      };
    },
  );
}

export function calculateStochastic(
  candles: readonly Candle[],
  kPeriod = DEFAULT_K_PERIOD,
  dPeriod = DEFAULT_D_PERIOD,
  smoothKPeriod =
    DEFAULT_SMOOTH_K_PERIOD,
): StochasticResult {
  const series =
    calculateStochasticSeries(
      candles,
      kPeriod,
      dPeriod,
      smoothKPeriod,
    );

  const latest =
    series.length > 0
      ? series[series.length - 1]
      : undefined;

  const percentK =
    latest?.percentK ?? null;

  const percentD =
    latest?.percentD ?? null;

  return {
    kPeriod,
    dPeriod,
    smoothKPeriod,
    percentK,
    percentD,
    condition: getCondition(
      percentK,
      percentD,
    ),
  };
}