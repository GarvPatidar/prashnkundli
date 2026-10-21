import type { Candle } from "../indicators/indicator.types.js";

/**
 * Pure outcome rules for a logged signal. No I/O, so it is unit-testable.
 *
 * Conservative on purpose:
 *  - Only candles that open AFTER the signal was issued are used.
 *  - If one candle touches both stop and target, the stop counts.
 *  - The entry candle itself can already stop the trade out.
 */

export type TrackedStatus =
  | "PENDING"
  | "ACTIVE"
  | "TP1_HIT"
  | "STOPPED"
  | "EXPIRED"
  | "TIMEOUT";

export interface TrackedSignal {
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  riskReward1: number;
  createdAt: Date;
  expiresAt: Date;
  maxHoldUntil: Date;
  status: TrackedStatus;
  triggeredAt: Date | null;
  tp2Hit: boolean;
}

export interface TrackedUpdate {
  status: TrackedStatus;
  triggeredAt: Date | null;
  closedAt: Date | null;
  exitPrice: number | null;
  resultR: number | null;
  tp2Hit: boolean;
}

const M15_MS = 15 * 60_000;

export function evaluateSignal(
  signal: TrackedSignal,
  candles: Candle[],
  now: Date,
): TrackedUpdate | null {
  if (signal.status !== "PENDING" && signal.status !== "ACTIVE") {
    return null;
  }

  const buy = signal.direction === "BUY";
  const risk = Math.abs(signal.entry - signal.stopLoss);

  if (risk <= 0) {
    return null;
  }

  const sorted = candles
    .map((c) => ({ ...c, t: Date.parse(c.timestamp) }))
    .filter((c) => Number.isFinite(c.t) && c.t >= signal.createdAt.getTime())
    .sort((a, b) => a.t - b.t);

  let status: TrackedStatus = signal.status;
  let triggeredAt = signal.triggeredAt;
  let tp2Hit = signal.tp2Hit;
  let lastClose: number | null = null;

  const result = (
    s: TrackedStatus,
    closedAt: Date,
    exit: number,
    r: number,
  ): TrackedUpdate => ({
    status: s,
    triggeredAt,
    closedAt,
    exitPrice: exit,
    resultR: Math.round(r * 100) / 100,
    tp2Hit,
  });

  for (const c of sorted) {
    const candleEnd = new Date(c.t + M15_MS);

    if (status === "PENDING") {
      if (c.t > signal.expiresAt.getTime()) {
        break;
      }

      if (c.low <= signal.entry && c.high >= signal.entry) {
        status = "ACTIVE";
        triggeredAt = new Date(c.t);
      } else {
        continue;
      }
    }

    if (status === "ACTIVE") {
      /*
       * The entry candle only counts when price actually moved against or
       * through the level after the touch; we cannot know the order inside a
       * candle, so the stop is checked first.
       */
      const stopHit = buy ? c.low <= signal.stopLoss : c.high >= signal.stopLoss;
      const tpHit = buy ? c.high >= signal.tp1 : c.low <= signal.tp1;

      if (stopHit) {
        return result("STOPPED", candleEnd, signal.stopLoss, -1);
      }

      if (tpHit) {
        if (signal.tp2 !== null) {
          tp2Hit = buy ? c.high >= signal.tp2 : c.low <= signal.tp2;
        }

        return result("TP1_HIT", candleEnd, signal.tp1, signal.riskReward1);
      }

      if (c.t + M15_MS > signal.maxHoldUntil.getTime()) {
        const move = buy ? c.close - signal.entry : signal.entry - c.close;
        return result("TIMEOUT", candleEnd, c.close, move / risk);
      }
    }

    lastClose = c.close;
  }

  if (status === "PENDING" && now.getTime() > signal.expiresAt.getTime()) {
    return {
      status: "EXPIRED",
      triggeredAt: null,
      closedAt: signal.expiresAt,
      exitPrice: null,
      resultR: null,
      tp2Hit: false,
    };
  }

  if (status === "ACTIVE" && now.getTime() > signal.maxHoldUntil.getTime()) {
    const exit = lastClose ?? signal.entry;
    const move = buy ? exit - signal.entry : signal.entry - exit;
    return result("TIMEOUT", signal.maxHoldUntil, exit, move / risk);
  }

  if (status !== signal.status) {
    return {
      status,
      triggeredAt,
      closedAt: null,
      exitPrice: null,
      resultR: null,
      tp2Hit,
    };
  }

  return null;
}
