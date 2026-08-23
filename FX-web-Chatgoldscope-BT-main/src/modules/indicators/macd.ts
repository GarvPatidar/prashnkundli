import type {
  Candle,
  MacdResult,
} from "./indicator.types.js";
import {
  getClosingPrices,
  roundIndicatorValue,
} from "./candle.utils.js";

const DEFAULT_FAST_PERIOD = 12;
const DEFAULT_SLOW_PERIOD = 26;
const DEFAULT_SIGNAL_PERIOD = 9;

function validateMacdPeriods(
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): void {
  const periods = [
    fastPeriod,
    slowPeriod,
    signalPeriod,
  ];

  if (
    periods.some(
      (period) =>
        !Number.isInteger(period) ||
        period <= 0,
    )
  ) {
    throw new Error(
      "MACD periods must be positive integers.",
    );
  }

  if (fastPeriod >= slowPeriod) {
    throw new Error(
      "MACD fast period must be smaller than the slow period.",
    );
  }
}

function calculateNumericEmaSeries(
  values: readonly number[],
  period: number,
): Array<number | null> {
  const result: Array<number | null> =
    Array.from(
      {
        length: values.length,
      },
      () => null,
    );

  if (values.length < period) {
    return result;
  }

  const initialValues =
    values.slice(0, period);

  const initialSma =
    initialValues.reduce(
      (total, value) =>
        total + value,
      0,
    ) / period;

  const firstEmaIndex = period - 1;

  result[firstEmaIndex] =
    initialSma;

  const multiplier =
    2 / (period + 1);

  let previousEma = initialSma;

  for (
    let index = period;
    index < values.length;
    index += 1
  ) {
    const currentValue =
      values[index];

    if (currentValue === undefined) {
      throw new Error(
        "MACD calculation encountered missing data.",
      );
    }

    const currentEma =
      (currentValue - previousEma) *
        multiplier +
      previousEma;

    result[index] = currentEma;
    previousEma = currentEma;
  }

  return result;
}

export interface MacdSeriesPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function calculateMacdSeries(
  candles: readonly Candle[],
  fastPeriod = DEFAULT_FAST_PERIOD,
  slowPeriod = DEFAULT_SLOW_PERIOD,
  signalPeriod = DEFAULT_SIGNAL_PERIOD,
): MacdSeriesPoint[] {
  validateMacdPeriods(
    fastPeriod,
    slowPeriod,
    signalPeriod,
  );

  const closingPrices =
    getClosingPrices(candles);

  const fastEmaSeries =
    calculateNumericEmaSeries(
      closingPrices,
      fastPeriod,
    );

  const slowEmaSeries =
    calculateNumericEmaSeries(
      closingPrices,
      slowPeriod,
    );

  const macdValues: Array<number | null> =
    closingPrices.map(
      (_, index) => {
        const fastEma =
          fastEmaSeries[index];

        const slowEma =
          slowEmaSeries[index];

        if (
          fastEma === null ||
          fastEma === undefined ||
          slowEma === null ||
          slowEma === undefined
        ) {
          return null;
        }

        return fastEma - slowEma;
      },
    );

  const validMacdValues =
    macdValues.filter(
      (value): value is number =>
        value !== null,
    );

  const signalValues =
    calculateNumericEmaSeries(
      validMacdValues,
      signalPeriod,
    );

  const firstMacdIndex =
    macdValues.findIndex(
      (value) => value !== null,
    );

  const result: MacdSeriesPoint[] =
    macdValues.map(() => ({
      macd: null,
      signal: null,
      histogram: null,
    }));

  macdValues.forEach(
    (macdValue, index) => {
      if (macdValue === null) {
        return;
      }

      const signalIndex =
        index - firstMacdIndex;

      const signalValue =
        signalValues[signalIndex];

      const roundedMacd =
        roundIndicatorValue(
          macdValue,
        );

      if (
  signalValue === null ||
  signalValue === undefined
) {
  result[index] = {
    macd: roundedMacd,
    signal: null,
    histogram: null,
  };

  return;
}

const roundedSignal =
  roundIndicatorValue(signalValue);

result[index] = {
  macd: roundedMacd,
  signal: roundedSignal,
  histogram: roundIndicatorValue(
    macdValue - signalValue,
  ),
};
    },
  );

  return result;
}

export function calculateMacd(
  candles: readonly Candle[],
  fastPeriod = DEFAULT_FAST_PERIOD,
  slowPeriod = DEFAULT_SLOW_PERIOD,
  signalPeriod = DEFAULT_SIGNAL_PERIOD,
): MacdResult {
  const series = calculateMacdSeries(
    candles,
    fastPeriod,
    slowPeriod,
    signalPeriod,
  );

  const latest =
    series.length > 0
      ? series[series.length - 1]
      : undefined;

  return {
    macd: latest?.macd ?? null,
    signal:
      latest?.signal ?? null,
    histogram:
      latest?.histogram ?? null,
  };
}