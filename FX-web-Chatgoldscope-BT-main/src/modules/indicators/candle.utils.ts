import type { Candle } from "./indicator.types.js";

export type CandleValidationErrorCode =
  | "EMPTY_CANDLE_SET"
  | "INVALID_TIMESTAMP"
  | "DUPLICATE_TIMESTAMP"
  | "UNSORTED_CANDLES"
  | "INVALID_PRICE"
  | "INVALID_OHLC_RELATION"
  | "INVALID_VOLUME";

export class CandleValidationError extends Error {
  constructor(
    message: string,
    public readonly code: CandleValidationErrorCode,
    public readonly candleIndex?: number,
  ) {
    super(message);
    this.name = "CandleValidationError";
  }
}

function assertFiniteNumber(
  value: number,
  fieldName: string,
  candleIndex: number,
): void {
  if (!Number.isFinite(value)) {
    throw new CandleValidationError(
      `${fieldName} must be a finite number.`,
      "INVALID_PRICE",
      candleIndex,
    );
  }

  if (value <= 0) {
    throw new CandleValidationError(
      `${fieldName} must be greater than zero.`,
      "INVALID_PRICE",
      candleIndex,
    );
  }
}

function parseTimestamp(
  timestamp: string,
  candleIndex: number,
): number {
  const parsedTimestamp = Date.parse(timestamp);

  if (!Number.isFinite(parsedTimestamp)) {
    throw new CandleValidationError(
      "Candle timestamp is invalid.",
      "INVALID_TIMESTAMP",
      candleIndex,
    );
  }

  return parsedTimestamp;
}

function validateOhlcRelationship(
  candle: Candle,
  candleIndex: number,
): void {
  const highestBodyPrice = Math.max(
    candle.open,
    candle.close,
  );

  const lowestBodyPrice = Math.min(
    candle.open,
    candle.close,
  );

  if (candle.high < highestBodyPrice) {
    throw new CandleValidationError(
      "Candle high cannot be below open or close.",
      "INVALID_OHLC_RELATION",
      candleIndex,
    );
  }

  if (candle.low > lowestBodyPrice) {
    throw new CandleValidationError(
      "Candle low cannot be above open or close.",
      "INVALID_OHLC_RELATION",
      candleIndex,
    );
  }

  if (candle.low > candle.high) {
    throw new CandleValidationError(
      "Candle low cannot be greater than candle high.",
      "INVALID_OHLC_RELATION",
      candleIndex,
    );
  }
}

function validateVolume(
  volume: number | null,
  candleIndex: number,
): void {
  if (volume === null) {
    return;
  }

  if (!Number.isFinite(volume) || volume < 0) {
    throw new CandleValidationError(
      "Candle volume must be null or a finite non-negative number.",
      "INVALID_VOLUME",
      candleIndex,
    );
  }
}

export function validateCandles(
  candles: readonly Candle[],
): void {
  if (candles.length === 0) {
    throw new CandleValidationError(
      "At least one candle is required.",
      "EMPTY_CANDLE_SET",
    );
  }

  const seenTimestamps = new Set<number>();
  let previousTimestamp: number | null = null;

  candles.forEach((candle, index) => {
    const timestamp = parseTimestamp(
      candle.timestamp,
      index,
    );

    if (seenTimestamps.has(timestamp)) {
      throw new CandleValidationError(
        "Duplicate candle timestamp detected.",
        "DUPLICATE_TIMESTAMP",
        index,
      );
    }

    if (
      previousTimestamp !== null &&
      timestamp <= previousTimestamp
    ) {
      throw new CandleValidationError(
        "Candles must be sorted from oldest to newest.",
        "UNSORTED_CANDLES",
        index,
      );
    }

    assertFiniteNumber(
      candle.open,
      "Candle open",
      index,
    );

    assertFiniteNumber(
      candle.high,
      "Candle high",
      index,
    );

    assertFiniteNumber(
      candle.low,
      "Candle low",
      index,
    );

    assertFiniteNumber(
      candle.close,
      "Candle close",
      index,
    );

    validateOhlcRelationship(
      candle,
      index,
    );

    validateVolume(
      candle.volume,
      index,
    );

    seenTimestamps.add(timestamp);
    previousTimestamp = timestamp;
  });
}

export function getClosingPrices(
  candles: readonly Candle[],
): number[] {
  validateCandles(candles);

  return candles.map((candle) => candle.close);
}

export function getTypicalPrices(
  candles: readonly Candle[],
): number[] {
  validateCandles(candles);

  return candles.map(
    (candle) =>
      (candle.high +
        candle.low +
        candle.close) /
      3,
  );
}

export function getTrueRanges(
  candles: readonly Candle[],
): number[] {
  validateCandles(candles);

  return candles.map((candle, index) => {
    if (index === 0) {
      return candle.high - candle.low;
    }

    const previousCandle =
      candles[index - 1];

    if (!previousCandle) {
      throw new CandleValidationError(
        "Previous candle is missing.",
        "INVALID_OHLC_RELATION",
        index,
      );
    }

    return Math.max(
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
  });
}

export function roundIndicatorValue(
  value: number,
  decimalPlaces = 5,
): number {
  if (!Number.isFinite(value)) {
    throw new Error(
      "Indicator value must be finite.",
    );
  }

  if (
    !Number.isInteger(decimalPlaces) ||
    decimalPlaces < 0 ||
    decimalPlaces > 12
  ) {
    throw new Error(
      "Decimal places must be an integer between 0 and 12.",
    );
  }

  return Number(value.toFixed(decimalPlaces));
}