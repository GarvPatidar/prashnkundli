import type { Candle } from "../indicators/indicator.types.js";
import type {
  CandleProvider,
  GetCandlesInput,
  MarketTimeframe,
} from "./candle.provider.js";

const DEFAULT_STARTING_PRICE = 2_350;

const TIMEFRAME_INTERVALS_MS: Record<
  MarketTimeframe,
  number
> = {
  M15: 15 * 60 * 1_000,
  H1: 60 * 60 * 1_000,
  H4: 4 * 60 * 60 * 1_000,
  D1: 24 * 60 * 60 * 1_000,
};

const TIMEFRAME_VOLATILITY: Record<
  MarketTimeframe,
  number
> = {
  M15: 1.4,
  H1: 2.8,
  H4: 5.6,
  D1: 12,
};

function validateInput(
  input: GetCandlesInput,
): void {
  if (
    !Number.isInteger(input.limit) ||
    input.limit < 2 ||
    input.limit > 5_000
  ) {
    throw new Error(
      "Candle limit must be an integer between 2 and 5000.",
    );
  }
}

/**
 * Deterministic pseudo-random generator.
 * Mock output remains stable for the supplied seed.
 */
function createSeededRandom(
  initialSeed: number,
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed =
      (seed * 1_664_525 + 1_013_904_223) >>>
      0;

    return seed / 4_294_967_296;
  };
}

function getTimeframeSeed(
  timeframe: MarketTimeframe,
): number {
  switch (timeframe) {
    case "M15":
      return 15_015;

    case "H1":
      return 101_001;

    case "H4":
      return 404_004;

    case "D1":
      return 1_001_001;
  }
}

function alignTimestamp(
  timestamp: number,
  interval: number,
): number {
  return (
    Math.floor(timestamp / interval) *
    interval
  );
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

function generateCandles(
  timeframe: MarketTimeframe,
  limit: number,
): Candle[] {
  const interval =
    TIMEFRAME_INTERVALS_MS[timeframe];

  const volatility =
    TIMEFRAME_VOLATILITY[timeframe];

  const random = createSeededRandom(
    getTimeframeSeed(timeframe) + limit,
  );

  const latestTimestamp =
    alignTimestamp(Date.now(), interval);

  const firstTimestamp =
    latestTimestamp -
    (limit - 1) * interval;

  const candles: Candle[] = [];

  let previousClose =
    DEFAULT_STARTING_PRICE +
    random() * 20;

  for (
    let index = 0;
    index < limit;
    index += 1
  ) {
    const timestamp =
      firstTimestamp + index * interval;

    /*
     * Slow cyclical drift prevents the mock feed
     * from becoming a completely random walk.
     */
    const cyclicalDrift =
      Math.sin(index / 18) *
      volatility *
      0.2;

    const randomMovement =
      (random() - 0.48) *
      volatility;

    const open = previousClose;

    const close = Math.max(
      100,
      open +
        cyclicalDrift +
        randomMovement,
    );

    const upperWick =
      random() * volatility * 0.7;

    const lowerWick =
      random() * volatility * 0.7;

    const high =
      Math.max(open, close) + upperWick;

    const low = Math.max(
      0.01,
      Math.min(open, close) - lowerWick,
    );

    const volume =
      Math.round(
        500 +
          random() * 4_500 +
          Math.abs(close - open) * 300,
      );

    candles.push({
      timestamp:
        new Date(timestamp).toISOString(),
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume,
    });

    previousClose = close;
  }

  return candles;
}

export class MockCandleProvider
  implements CandleProvider
{
  async getCandles(
    input: GetCandlesInput,
  ): Promise<Candle[]> {
    validateInput(input);

    return generateCandles(
      input.timeframe,
      input.limit,
    );
  }
}