import type { CompleteIndicatorSnapshot } from "../indicators/indicator.service.js";
import type { MarketIntelligenceResult } from "../analysis/market-intelligence.service.js";
import {
  buildTradeScenarios,
  type TradeScenario,
  type TradeScenarioSet,
} from "../analysis/trade-scenarios.js";

/**
 * Deterministic decision layer. Top-down:
 *   D1/H4 -> allowed direction, H1 -> setup, M15 -> trigger.
 * The AI never changes this verdict; it only phrases it.
 */

export type Dir = "UP" | "DOWN" | "FLAT";
export type Conviction = "LOW" | "MEDIUM" | "HIGH";
export type Action = "BUY" | "SELL" | "WAIT";
export type EntryState = "NOW" | "PULLBACK" | "NONE";
export type Horizon = "SCALP" | "INTRADAY" | "SWING";

export interface TimeframeRead {
  timeframe: "M15" | "H1" | "H4" | "D1";
  dir: Dir;
  /** -1 (fully bearish) .. +1 (fully bullish). */
  score: number;
  trend: "BULLISH" | "BEARISH" | "RANGING" | "INSUFFICIENT_DATA";
  rsi: number | null;
  rsiCondition: string;
  adx: number | null;
  adxStrength: string;
  atr: number | null;
  volatility: string;
  macdHistogram: number | null;
  ema50: number | null;
  ema200: number | null;
}

export interface Decision {
  action: Action;
  conviction: Conviction;
  entryState: EntryState;
  horizon: Horizon;
  price: number;
  atrH1: number | null;
  reads: Record<"M15" | "H1" | "H4" | "D1", TimeframeRead>;
  htfDir: Dir;
  /** Direction the engine leans toward, even when it says WAIT. */
  lean: Dir;
  /** Plan for the verdict direction (BUY/SELL), if a clean level exists. */
  plan: TradeScenario | null;
  /** Plans for both sides, lean side first. */
  plans: TradeScenario[];
  scenarios: TradeScenarioSet;
  /** Codes explaining why the verdict is what it is. */
  why: WhyCode[];
  marketClosed: boolean;
  /** Next H1 candle close, when this view is refreshed. */
  validUntil: string;
  lowRewardToRisk: boolean;
}

export type WhyCode =
  | "HTF_ALIGNED"
  | "HTF_CONFLICT"
  | "HTF_D1_AGAINST"
  | "H1_CONFIRMS"
  | "H1_AGAINST_HTF"
  | "H1_NOT_CONFIRMED"
  | "M15_TRIGGER"
  | "M15_NO_TRIGGER"
  | "TREND_STRONG"
  | "TREND_WEAK"
  | "RSI_STRETCHED"
  | "VOL_HIGH"
  | "VOL_COMPRESSED"
  | "NO_CLEAN_LEVEL"
  | "LOW_RR"
  | "RISK_ELEVATED"
  | "MARKET_CLOSED";

const dirOf = (score: number, threshold = 0.3): Dir =>
  score >= threshold ? "UP" : score <= -threshold ? "DOWN" : "FLAT";

const sign = (value: number | null | undefined): number =>
  value === null || value === undefined || value === 0
    ? 0
    : value > 0
      ? 1
      : -1;

function readTimeframe(
  timeframe: TimeframeRead["timeframe"],
  snapshot: CompleteIndicatorSnapshot,
  price: number,
): TimeframeRead {
  const parts: number[] = [];

  const trend = snapshot.structure.trend;
  parts.push(trend === "BULLISH" ? 1 : trend === "BEARISH" ? -1 : 0);

  const { value: ema20 } = snapshot.ema20;
  const { value: ema50 } = snapshot.ema50;
  const { value: ema200 } = snapshot.ema200;

  if (ema50 !== null) parts.push(price > ema50 ? 1 : -1);
  if (ema200 !== null) parts.push(price > ema200 ? 1 : -1);
  if (ema20 !== null && ema50 !== null) parts.push(ema20 > ema50 ? 1 : -1);

  const histogram = snapshot.macd.histogram;
  if (histogram !== null) parts.push(sign(histogram));

  const score =
    parts.length === 0
      ? 0
      : parts.reduce((sum, value) => sum + value, 0) / parts.length;

  return {
    timeframe,
    dir: dirOf(score),
    score: Number(score.toFixed(2)),
    trend,
    rsi: snapshot.rsi14.value,
    rsiCondition: snapshot.rsi14.condition,
    adx: snapshot.adx14.adx,
    adxStrength: snapshot.adx14.strength,
    atr: snapshot.atr14.value,
    volatility: snapshot.structure.volatility,
    macdHistogram: histogram,
    ema50,
    ema200,
  };
}

function nextH1Close(now: Date): string {
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.toISOString();
}

export interface DecideInput {
  result: MarketIntelligenceResult;
  /** Live quote price; falls back to the latest M15 close. */
  livePrice?: number | null;
  marketClosed?: boolean;
  riskScore?: number | null;
  horizon?: Horizon;
  now?: Date;
}

const HORIZON_STOP: Record<Horizon, number> = {
  SCALP: 0.5,
  INTRADAY: 1.0,
  SWING: 1.5,
};

export function decide(input: DecideInput): Decision {
  const { snapshots } = input.result.marketAnalysis;
  const price = input.livePrice ?? snapshots.M15.metadata.latestClose;
  const horizon = input.horizon ?? "INTRADAY";
  const now = input.now ?? new Date();

  const reads = {
    M15: readTimeframe("M15", snapshots.M15, price),
    H1: readTimeframe("H1", snapshots.H1, price),
    H4: readTimeframe("H4", snapshots.H4, price),
    D1: readTimeframe("D1", snapshots.D1, price),
  };

  const htfScore = reads.D1.score * 0.4 + reads.H4.score * 0.6;
  const htfDir = dirOf(htfScore, 0.25);
  const why: WhyCode[] = [];

  let lean: Dir = "FLAT";
  let conviction: Conviction = "LOW";

  const adxOk = ["DEVELOPING", "STRONG", "VERY_STRONG"].includes(
    reads.H4.adxStrength,
  );

  const d1Against =
    htfDir !== "FLAT" && reads.D1.dir !== "FLAT" && reads.D1.dir !== htfDir;

  if (htfDir !== "FLAT" && reads.H1.dir === htfDir) {
    lean = htfDir;
    why.push(d1Against ? "HTF_D1_AGAINST" : "HTF_ALIGNED", "H1_CONFIRMS");
    if (reads.M15.dir === lean) {
      why.push("M15_TRIGGER");
      conviction = adxOk && !d1Against ? "HIGH" : "MEDIUM";
    } else {
      why.push("M15_NO_TRIGGER");
      conviction = "MEDIUM";
    }
  } else if (htfDir !== "FLAT" && reads.H1.dir === "FLAT") {
    lean = htfDir;
    why.push(d1Against ? "HTF_D1_AGAINST" : "HTF_ALIGNED", "H1_NOT_CONFIRMED");
    conviction = "LOW";
  } else if (htfDir !== "FLAT") {
    // H1 is pulling back against the higher timeframes.
    lean = htfDir;
    why.push("H1_AGAINST_HTF");
    conviction = "LOW";
  } else if (reads.H4.dir !== "FLAT" && reads.H4.dir === reads.H1.dir) {
    lean = reads.H4.dir;
    why.push("HTF_CONFLICT", "H1_CONFIRMS");
    conviction = "LOW";
  } else {
    why.push("HTF_CONFLICT");
  }

  if (conviction !== "LOW") {
    why.push(adxOk ? "TREND_STRONG" : "TREND_WEAK");
  }

  const stretched =
    (lean === "UP" && reads.H1.rsiCondition === "OVERBOUGHT") ||
    (lean === "DOWN" && reads.H1.rsiCondition === "OVERSOLD");

  if (stretched) {
    why.push("RSI_STRETCHED");
    if (conviction === "HIGH") conviction = "MEDIUM";
  }

  if (reads.H1.volatility === "HIGH") why.push("VOL_HIGH");
  if (reads.H4.volatility === "LOW") why.push("VOL_COMPRESSED");

  if (input.riskScore !== null && input.riskScore !== undefined && input.riskScore >= 60) {
    why.push("RISK_ELEVATED");
    conviction = "LOW";
  }

  const marketClosed = input.marketClosed === true;
  if (marketClosed) {
    why.push("MARKET_CLOSED");
    conviction = "LOW";
  }

  const scenarios = buildTradeScenarios(input.result, {
    stopBufferAtr: HORIZON_STOP[horizon],
    referencePrice: price,
    ...(horizon === "SWING" ? { levelTimeframes: ["H4", "D1"] as const } : {}),
  });

  const byDirection = (direction: "BUY" | "SELL"): TradeScenario | null =>
    scenarios.scenarios.find((scenario) => scenario.direction === direction) ??
    null;

  const leanSide: "BUY" | "SELL" | null =
    lean === "UP" ? "BUY" : lean === "DOWN" ? "SELL" : null;

  const plans: TradeScenario[] = [];
  if (leanSide) {
    const first = byDirection(leanSide);
    if (first) plans.push(first);
  }
  for (const side of ["BUY", "SELL"] as const) {
    const plan = byDirection(side);
    if (plan && !plans.includes(plan)) plans.push(plan);
  }

  const leanPlan = leanSide ? byDirection(leanSide) : null;
  const atr = scenarios.atrH1;

  let lowRewardToRisk = false;
  if (leanPlan) {
    const rr = leanPlan.riskReward[0] ?? 0;
    if (rr < 1) {
      lowRewardToRisk = true;
      why.push("LOW_RR");
      if (conviction === "HIGH") conviction = "MEDIUM";
    }
  } else if (leanSide) {
    why.push("NO_CLEAN_LEVEL");
  }

  const action: Action =
    leanSide && conviction !== "LOW" && leanPlan ? leanSide : "WAIT";

  let entryState: EntryState = "NONE";
  if (action !== "WAIT" && leanPlan && atr) {
    const near = Math.abs(price - leanPlan.entry) <= atr * 0.35;
    entryState =
      near && reads.M15.dir === lean && !stretched ? "NOW" : "PULLBACK";
  }

  return {
    action,
    conviction,
    entryState,
    horizon,
    price,
    atrH1: atr,
    reads,
    htfDir,
    lean,
    plan: action === "WAIT" ? null : leanPlan,
    plans,
    scenarios,
    why,
    marketClosed,
    validUntil: nextH1Close(now),
    lowRewardToRisk,
  };
}
