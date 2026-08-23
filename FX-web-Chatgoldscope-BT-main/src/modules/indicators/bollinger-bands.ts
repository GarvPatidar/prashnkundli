import type {
  BollingerBandsResult,
  Candle,
} from "./indicator.types.js";
import {
  getClosingPrices,
  roundIndicatorValue,
} from "./candle.utils.js";

const DEFAULT_PERIOD = 20;
const DEFAULT_STANDARD_DEVIATIONS = 2;

function validateInputs(
  period: number,
  standardDeviations: number,
): void {
  if (
    !Number.isInteger(period) ||
    period <= 0
  ) {
    throw new Error(
      "Bollinger Bands period must be a positive integer.",
    );
  }

  if (
    !Number.isFinite(standardDeviations) ||
    standardDeviations <= 0
  ) {
    throw new Error(
      "Bollinger Bands standard deviation multiplier must be greater than zero.",
    );
  }
}

function calculateMean(
  values: readonly number[],
): number {
  return (
    values.reduce(
      (total, value) => total + value,
      0,
    ) / values.length
  );
}

function calculatePopulationStandardDeviation(
  values: readonly number[],
  mean: number,
): number {
  const variance =
    values.reduce(
      (total, value) => {
        const difference = value - mean;

        return (
          total +
          difference * difference
        );
      },
      0,
    ) / values.length;

  return Math.sqrt(variance);
}

export interface BollingerBandsSeriesPoint {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function calculateBollingerBandsSeries(
  candles: readonly Candle[],
  period = DEFAULT_PERIOD,
  standardDeviations =
    DEFAULT_STANDARD_DEVIATIONS,
): BollingerBandsSeriesPoint[] {
  validateInputs(
    period,
    standardDeviations,
  );

  const closingPrices =
    getClosingPrices(candles);

  const result: BollingerBandsSeriesPoint[] =
    Array.from(
      {
        length: closingPrices.length,
      },
      () => ({
        upper: null,
        middle: null,
        lower: null,
      }),
    );

  if (closingPrices.length < period) {
    return result;
  }

  for (
    let index = period - 1;
    index < closingPrices.length;
    index += 1
  ) {
    const startIndex =
      index - period + 1;

    const window =
      closingPrices.slice(
        startIndex,
        index + 1,
      );

    if (window.length !== period) {
      throw new Error(
        "Bollinger Bands calculation encountered incomplete price data.",
      );
    }

    const middle =
      calculateMean(window);

    const standardDeviation =
      calculatePopulationStandardDeviation(
        window,
        middle,
      );

    const bandDistance =
      standardDeviation *
      standardDeviations;

    result[index] = {
      upper: roundIndicatorValue(
        middle + bandDistance,
      ),
      middle:
        roundIndicatorValue(middle),
      lower: roundIndicatorValue(
        middle - bandDistance,
      ),
    };
  }

  return result;
}

export function calculateBollingerBands(
  candles: readonly Candle[],
  period = DEFAULT_PERIOD,
  standardDeviations =
    DEFAULT_STANDARD_DEVIATIONS,
): BollingerBandsResult {
  const series =
    calculateBollingerBandsSeries(
      candles,
      period,
      standardDeviations,
    );

  const latest =
    series.length > 0
      ? series[series.length - 1]
      : undefined;

  return {
    period,
    standardDeviations,
    upper: latest?.upper ?? null,
    middle: latest?.middle ?? null,
    lower: latest?.lower ?? null,
  };
}