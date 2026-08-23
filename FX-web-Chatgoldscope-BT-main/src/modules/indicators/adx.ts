import type {
  AdxResult,
  Candle,
} from "./indicator.types.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";

const DEFAULT_PERIOD = 14;

interface DirectionalMovementPoint {
  trueRange: number;
  plusDm: number;
  minusDm: number;
}

function validatePeriod(period: number): void {
  if (
    !Number.isInteger(period) ||
    period <= 0
  ) {
    throw new Error(
      "ADX period must be a positive integer.",
    );
  }
}

function getStrength(
  adx: number | null,
): AdxResult["strength"] {
  if (adx === null) {
    return "UNAVAILABLE";
  }

  if (adx < 20) {
    return "WEAK";
  }

  if (adx < 25) {
    return "DEVELOPING";
  }

  if (adx < 50) {
    return "STRONG";
  }

  return "VERY_STRONG";
}

function calculateDirectionalMovement(
  candles: readonly Candle[],
): DirectionalMovementPoint[] {
  validateCandles(candles);

  return candles.map((candle, index) => {
    if (index === 0) {
      return {
        trueRange: candle.high - candle.low,
        plusDm: 0,
        minusDm: 0,
      };
    }

    const previousCandle =
      candles[index - 1];

    if (!previousCandle) {
      throw new Error(
        "ADX calculation encountered missing previous candle.",
      );
    }

    const upwardMove =
      candle.high - previousCandle.high;

    const downwardMove =
      previousCandle.low - candle.low;

    const plusDm =
      upwardMove > downwardMove &&
      upwardMove > 0
        ? upwardMove
        : 0;

    const minusDm =
      downwardMove > upwardMove &&
      downwardMove > 0
        ? downwardMove
        : 0;

    const trueRange = Math.max(
      candle.high - candle.low,
      Math.abs(
        candle.high -
          previousCandle.close,
      ),
      Math.abs(
        candle.low -
          previousCandle.close,
      ),
    );

    return {
      trueRange,
      plusDm,
      minusDm,
    };
  });
}

function smoothSeries(
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

  const initialSum = values
    .slice(0, period)
    .reduce(
      (total, value) => total + value,
      0,
    );

  result[period - 1] = initialSum;

  let previousSmoothed = initialSum;

  for (
    let index = period;
    index < values.length;
    index += 1
  ) {
    const currentValue = values[index];

    if (currentValue === undefined) {
      throw new Error(
        "ADX smoothing encountered missing data.",
      );
    }

    const currentSmoothed =
      previousSmoothed -
      previousSmoothed / period +
      currentValue;

    result[index] = currentSmoothed;
    previousSmoothed = currentSmoothed;
  }

  return result;
}

function calculateDx(
  plusDi: number,
  minusDi: number,
): number {
  const denominator =
    plusDi + minusDi;

  if (denominator === 0) {
    return 0;
  }

  return (
    Math.abs(plusDi - minusDi) /
    denominator
  ) * 100;
}

export interface AdxSeriesPoint {
  adx: number | null;
  plusDi: number | null;
  minusDi: number | null;
}

export function calculateAdxSeries(
  candles: readonly Candle[],
  period = DEFAULT_PERIOD,
): AdxSeriesPoint[] {
  validatePeriod(period);

  const directionalMovement =
    calculateDirectionalMovement(candles);

  const trueRanges =
    directionalMovement.map(
      (point) => point.trueRange,
    );

  const plusDmValues =
    directionalMovement.map(
      (point) => point.plusDm,
    );

  const minusDmValues =
    directionalMovement.map(
      (point) => point.minusDm,
    );

  const smoothedTrueRange =
    smoothSeries(trueRanges, period);

  const smoothedPlusDm =
    smoothSeries(plusDmValues, period);

  const smoothedMinusDm =
    smoothSeries(minusDmValues, period);

  const plusDiSeries: Array<
    number | null
  > = Array.from(
    {
      length: candles.length,
    },
    () => null,
  );

  const minusDiSeries: Array<
    number | null
  > = Array.from(
    {
      length: candles.length,
    },
    () => null,
  );

  const dxSeries: Array<number | null> =
    Array.from(
      {
        length: candles.length,
      },
      () => null,
    );

  for (
    let index = 0;
    index < candles.length;
    index += 1
  ) {
    const trueRange =
      smoothedTrueRange[index];

    const plusDm =
      smoothedPlusDm[index];

    const minusDm =
      smoothedMinusDm[index];

    if (
      trueRange === null ||
      trueRange === undefined ||
      plusDm === null ||
      plusDm === undefined ||
      minusDm === null ||
      minusDm === undefined ||
      trueRange === 0
    ) {
      continue;
    }

    const plusDi =
      (plusDm / trueRange) * 100;

    const minusDi =
      (minusDm / trueRange) * 100;

    plusDiSeries[index] = plusDi;
    minusDiSeries[index] = minusDi;
    dxSeries[index] =
      calculateDx(
        plusDi,
        minusDi,
      );
  }

  const validDxValues = dxSeries.filter(
    (value): value is number =>
      value !== null,
  );

  const adxValues =
    smoothSeries(
      validDxValues,
      period,
    );

  const firstDxIndex =
    dxSeries.findIndex(
      (value) => value !== null,
    );

  const result: AdxSeriesPoint[] =
    candles.map(() => ({
      adx: null,
      plusDi: null,
      minusDi: null,
    }));

  for (
    let index = 0;
    index < candles.length;
    index += 1
  ) {
    const plusDi =
      plusDiSeries[index];

    const minusDi =
      minusDiSeries[index];

    if (
      plusDi === null ||
      plusDi === undefined ||
      minusDi === null ||
      minusDi === undefined
    ) {
      continue;
    }

    const adxIndex =
      index - firstDxIndex;

    const smoothedAdx =
      adxValues[adxIndex];

    const adx =
      smoothedAdx === null ||
      smoothedAdx === undefined
        ? null
        : smoothedAdx / period;

    result[index] = {
      adx:
        adx === null
          ? null
          : roundIndicatorValue(adx),
      plusDi:
        roundIndicatorValue(plusDi),
      minusDi:
        roundIndicatorValue(minusDi),
    };
  }

  return result;
}

export function calculateAdx(
  candles: readonly Candle[],
  period = DEFAULT_PERIOD,
): AdxResult {
  const series = calculateAdxSeries(
    candles,
    period,
  );

  const latest =
    series.length > 0
      ? series[series.length - 1]
      : undefined;

  const adx = latest?.adx ?? null;

  return {
    period,
    adx,
    plusDi:
      latest?.plusDi ?? null,
    minusDi:
      latest?.minusDi ?? null,
    strength: getStrength(adx),
  };
}