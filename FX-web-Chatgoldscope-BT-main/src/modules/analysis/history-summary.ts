import type { Candle } from "../indicators/indicator.types.js";

export interface HistoryExtreme {
  price: number;
  date: string;
}

export interface HistoryPeriodChange {
  /** Calendar days covered. */
  days: number;
  startClose: number;
  changePercent: number;
}

/**
 * Facts computed from the REAL daily candles so the AI can answer
 * "1 year of data" style questions without inventing numbers.
 */
export interface HistorySummary {
  source: "daily-candles";
  candleCount: number;
  from: string;
  to: string;
  startClose: number;
  latestClose: number;
  changePercent: number;
  periodHigh: HistoryExtreme;
  periodLow: HistoryExtreme;
  /** 0 = at the period low, 100 = at the period high. */
  positionInRangePercent: number;
  /** How far the latest close is below the period high (negative). */
  drawdownFromHighPercent: number;
  /** How far the latest close is above the period low. */
  reboundFromLowPercent: number;
  averageDailyRange: number;
  last30Days: HistoryPeriodChange | null;
  last90Days: HistoryPeriodChange | null;
  /** Month-end closes, oldest first. */
  monthlyCloses: Array<{ month: string; close: number }>;
}

const round = (value: number, digits = 2): number =>
  Number(value.toFixed(digits));

const dayOf = (timestamp: string): string =>
  timestamp.slice(0, 10);

function periodChange(
  candles: readonly Candle[],
  days: number,
): HistoryPeriodChange | null {
  const last = candles[candles.length - 1];

  if (!last) {
    return null;
  }

  const cutoff =
    Date.parse(last.timestamp) - days * 86_400_000;

  const start = candles.find(
    (candle) => Date.parse(candle.timestamp) >= cutoff,
  );

  if (!start || start === last) {
    return null;
  }

  return {
    days,
    startClose: round(start.close),
    changePercent: round(
      ((last.close - start.close) / start.close) * 100,
    ),
  };
}

export function buildHistorySummary(
  dailyCandles: readonly Candle[],
): HistorySummary | null {
  const first = dailyCandles[0];
  const last = dailyCandles[dailyCandles.length - 1];

  if (!first || !last || dailyCandles.length < 20) {
    return null;
  }

  let high = first;
  let low = first;
  let rangeSum = 0;

  for (const candle of dailyCandles) {
    if (candle.high > high.high) {
      high = candle;
    }

    if (candle.low < low.low) {
      low = candle;
    }

    rangeSum += candle.high - candle.low;
  }

  const span = high.high - low.low;

  const monthEnds = new Map<string, number>();

  for (const candle of dailyCandles) {
    // Candles are chronological, so the last write per month wins.
    monthEnds.set(candle.timestamp.slice(0, 7), candle.close);
  }

  return {
    source: "daily-candles",
    candleCount: dailyCandles.length,
    from: dayOf(first.timestamp),
    to: dayOf(last.timestamp),
    startClose: round(first.close),
    latestClose: round(last.close),
    changePercent: round(
      ((last.close - first.close) / first.close) * 100,
    ),
    periodHigh: {
      price: round(high.high),
      date: dayOf(high.timestamp),
    },
    periodLow: {
      price: round(low.low),
      date: dayOf(low.timestamp),
    },
    positionInRangePercent:
      span > 0
        ? round(((last.close - low.low) / span) * 100, 1)
        : 50,
    drawdownFromHighPercent: round(
      ((last.close - high.high) / high.high) * 100,
    ),
    reboundFromLowPercent: round(
      ((last.close - low.low) / low.low) * 100,
    ),
    averageDailyRange: round(rangeSum / dailyCandles.length),
    last30Days: periodChange(dailyCandles, 30),
    last90Days: periodChange(dailyCandles, 90),
    monthlyCloses: [...monthEnds.entries()]
      .slice(-13)
      .map(([month, close]) => ({
        month,
        close: round(close),
      })),
  };
}
