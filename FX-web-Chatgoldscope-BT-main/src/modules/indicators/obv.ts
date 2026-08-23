import type {
  Candle,
  ObvResult,
} from "./indicator.types.js";
import {
  roundIndicatorValue,
  validateCandles,
} from "./candle.utils.js";

export interface ObvSeriesPoint {
  value: number | null;
}

function hasCompleteVolumeData(
  candles: readonly Candle[],
): boolean {
  return candles.every(
    (candle) =>
      candle.volume !== null &&
      Number.isFinite(candle.volume) &&
      candle.volume >= 0,
  );
}

export function calculateObvSeries(
  candles: readonly Candle[],
): ObvSeriesPoint[] {
  validateCandles(candles);

  if (!hasCompleteVolumeData(candles)) {
    return candles.map(() => ({
      value: null,
    }));
  }

  const result: ObvSeriesPoint[] =
    candles.map(() => ({
      value: null,
    }));

  let obv = 0;

  result[0] = {
    value: 0,
  };

  for (
    let index = 1;
    index < candles.length;
    index += 1
  ) {
    const currentCandle =
      candles[index];

    const previousCandle =
      candles[index - 1];

    if (
      !currentCandle ||
      !previousCandle
    ) {
      throw new Error(
        "OBV calculation encountered missing candle data.",
      );
    }

    const volume =
      currentCandle.volume;

    if (volume === null) {
      throw new Error(
        "OBV calculation requires volume data.",
      );
    }

    if (
      currentCandle.close >
      previousCandle.close
    ) {
      obv += volume;
    } else if (
      currentCandle.close <
      previousCandle.close
    ) {
      obv -= volume;
    }

    result[index] = {
      value:
        roundIndicatorValue(
          obv,
          2,
        ),
    };
  }

  return result;
}

export function calculateObv(
  candles: readonly Candle[],
): ObvResult {
  validateCandles(candles);

  if (!hasCompleteVolumeData(candles)) {
    return {
      value: null,
      source: "UNAVAILABLE",
    };
  }

  const series =
    calculateObvSeries(candles);

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
        : "VOLUME_BASED",
  };
}