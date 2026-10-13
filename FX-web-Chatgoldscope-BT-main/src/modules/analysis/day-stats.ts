import type { Candle } from "../indicators/indicator.types.js";

export interface DayRange {
  date: string;
  high: number;
  low: number;
}

/**
 * Real range facts from candles, so "today's high/low", "previous day high/low"
 * and "Asia range" are answered with numbers, never guesses.
 */
export interface DayStats {
  today: (DayRange & { open: number }) | null;
  previousDay: (DayRange & { close: number }) | null;
  asiaToday: DayRange | null;
  week: DayRange | null;
  /** Classic floor pivots from the previous day. */
  pivots: {
    pivot: number;
    r1: number;
    r2: number;
    s1: number;
    s2: number;
  } | null;
}

const round = (value: number): number => Number(value.toFixed(2));
const dayOf = (timestamp: string): string => timestamp.slice(0, 10);

function range(candles: readonly Candle[], date: string): DayRange | null {
  if (candles.length === 0) return null;

  return {
    date,
    high: round(Math.max(...candles.map((c) => c.high))),
    low: round(Math.min(...candles.map((c) => c.low))),
  };
}

export function buildDayStats(
  d1: readonly Candle[],
  m15: readonly Candle[],
  nowIso: string = new Date().toISOString(),
): DayStats {
  const todayDate = dayOf(nowIso);

  const todayM15 = m15.filter((c) => dayOf(c.timestamp) === todayDate);
  const todayRange = range(todayM15, todayDate);
  const first = todayM15[0];

  const asiaCandles = todayM15.filter((c) => {
    const hour = Number(c.timestamp.slice(11, 13));
    return hour >= 0 && hour < 9;
  });

  const previous = [...d1]
    .filter((c) => dayOf(c.timestamp) < todayDate)
    .at(-1);

  const monday = new Date(`${todayDate}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const mondayDate = monday.toISOString().slice(0, 10);

  const weekD1 = d1.filter((c) => dayOf(c.timestamp) >= mondayDate);
  const weekRange =
    weekD1.length > 0
      ? {
          date: mondayDate,
          high: round(Math.max(...weekD1.map((c) => c.high))),
          low: round(Math.min(...weekD1.map((c) => c.low))),
        }
      : null;

  let pivots: DayStats["pivots"] = null;

  if (previous) {
    const pivot = (previous.high + previous.low + previous.close) / 3;
    pivots = {
      pivot: round(pivot),
      r1: round(2 * pivot - previous.low),
      r2: round(pivot + (previous.high - previous.low)),
      s1: round(2 * pivot - previous.high),
      s2: round(pivot - (previous.high - previous.low)),
    };
  }

  return {
    today:
      todayRange && first
        ? { ...todayRange, open: round(first.open) }
        : null,
    previousDay: previous
      ? {
          date: dayOf(previous.timestamp),
          high: round(previous.high),
          low: round(previous.low),
          close: round(previous.close),
        }
      : null,
    asiaToday: range(asiaCandles, todayDate),
    week: weekRange,
    pivots,
  };
}
