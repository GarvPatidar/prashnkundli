import type {
  Candle,
  VwapResult,
} from "./indicator.types.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";

export interface VwapSeriesPoint {
  value: number | null;
}

function calculateTypicalPrice(
  candle: Candle,
): number {
  return (
    candle.high +
    candle.low +
    candle.close
  ) / 3;
}

export function calculateVwapSeries(
  candles: readonly Candle[],
): VwapSeriesPoint[] {
  validateCandles(candles);

  const result: VwapSeriesPoint[] =
    candles.map(() => ({
      value: null,
    }));

  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  candles.forEach((candle, index) => {
    const volume = candle.volume;

    if (
      volume === null ||
      volume <= 0
    ) {
      result[index] = {
        value: null,
      };

      return;
    }

    const typicalPrice =
      calculateTypicalPrice(candle);

    cumulativePriceVolume +=
      typicalPrice * volume;

    cumulativeVolume += volume;

    if (cumulativeVolume <= 0) {
      result[index] = {
        value: null,
      };

      return;
    }

    result[index] = {
      value: roundIndicatorValue(
        cumulativePriceVolume /
          cumulativeVolume,
      ),
    };
  });

  return result;
}

export function calculateVwap(
  candles: readonly Candle[],
): VwapResult {
  const hasCompleteVolumeData =
    candles.every(
      (candle) =>
        candle.volume !== null &&
        candle.volume > 0,
    );

  if (!hasCompleteVolumeData) {
    validateCandles(candles);

    return {
      value: null,
      source: "UNAVAILABLE",
    };
  }

  const series =
    calculateVwapSeries(candles);

  const latest =
    series.length > 0
      ? series[series.length - 1]
      : undefined;

  return {
    value: latest?.value ?? null,
    source:
      latest?.value === null ||
      latest?.value === undefined
        ? "UNAVAILABLE"
        : "VOLUME_WEIGHTED",
  };
}