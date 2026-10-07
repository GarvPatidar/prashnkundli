import type { MarketIntelligenceResult } from "./market-intelligence.service.js";

/**
 * Conditional trade plans built ONLY from levels the engine found
 * (support / resistance from H1, H4, D1) plus ATR for stop buffers.
 * They are scenarios ("if price does X, here is the plan"), never
 * personal advice, and every number is computed here, not by the AI.
 */

export interface TradeScenario {
  id: "SELL_REJECTION" | "BUY_BOUNCE";
  direction: "SELL" | "BUY";
  title: string;
  /** True when the scenario trades in the direction of the current bias. */
  alignedWithBias: boolean;
  /** What must happen before this plan is valid. */
  condition: string;
  entry: number;
  stopLoss: number;
  targets: number[];
  riskPoints: number;
  riskReward: number[];
  /** Where the plan is wrong. */
  invalidation: string;
  levelSource: string;
  /** Distance from the reference price to the entry level. */
  distanceToEntryPoints: number;
}

export interface TradeScenarioSet {
  available: boolean;
  referencePrice: number;
  /** H1 ATR(14), the volatility unit used for stop buffers. */
  atrH1: number | null;
  bias: MarketIntelligenceResult["summary"]["bias"];
  scenarios: TradeScenario[];
  notes: string[];
}

interface Level {
  price: number;
  timeframe: "M15" | "H1" | "H4" | "D1";
  touches: number;
}

const STOP_BUFFER_ATR = 0.5;
const MIN_LEVEL_DISTANCE_ATR = 0.25;
const MIN_LEVEL_GAP_ATR = 0.5;

/*
 * An entry level further away than this is not an actionable plan
 * ("sell at a resistance 600 points above").
 */
const MAX_ENTRY_DISTANCE_ATR = 8;

const round = (value: number): number => Number(value.toFixed(2));

function collectLevels(
  result: MarketIntelligenceResult,
  kind: "supports" | "resistances",
): Level[] {
  const { snapshots } = result.marketAnalysis;

  return (["H1", "H4", "D1"] as const).flatMap((timeframe) =>
    snapshots[timeframe].structure[kind].map((level) => ({
      price: level.price,
      timeframe,
      touches: level.touches,
    })),
  );
}

/** Nearest-first, dropping levels that are too close to each other. */
function pickLevels(
  levels: Level[],
  referencePrice: number,
  atr: number,
  direction: "above" | "below",
): Level[] {
  const filtered = levels
    .filter((level) =>
      direction === "above"
        ? level.price - referencePrice >= atr * MIN_LEVEL_DISTANCE_ATR
        : referencePrice - level.price >= atr * MIN_LEVEL_DISTANCE_ATR,
    )
    .sort((a, b) =>
      direction === "above" ? a.price - b.price : b.price - a.price,
    );

  const picked: Level[] = [];

  for (const level of filtered) {
    const previous = picked[picked.length - 1];

    if (
      !previous ||
      Math.abs(level.price - previous.price) >= atr * MIN_LEVEL_GAP_ATR
    ) {
      picked.push(level);
    }
  }

  return picked;
}

const describe = (level: Level): string =>
  `${level.timeframe} level, ${level.touches} touches`;

export function buildTradeScenarios(
  result: MarketIntelligenceResult,
): TradeScenarioSet {
  const { snapshots } = result.marketAnalysis;

  const referencePrice = snapshots.M15.metadata.latestClose;

  const atrH1 =
    snapshots.H1.atr14.value ??
    snapshots.H4.atr14.value ??
    snapshots.M15.atr14.value;

  const bias = result.summary.bias;

  if (atrH1 === null || atrH1 <= 0) {
    return {
      available: false,
      referencePrice: round(referencePrice),
      atrH1: null,
      bias,
      scenarios: [],
      notes: ["Volatility (ATR) is not available, so no trade plan is offered."],
    };
  }

  const resistances = pickLevels(
    collectLevels(result, "resistances"),
    referencePrice,
    atrH1,
    "above",
  );

  const supports = pickLevels(
    collectLevels(result, "supports"),
    referencePrice,
    atrH1,
    "below",
  );

  const bearish = result.summary.direction === "BEARISH";
  const bullish = result.summary.direction === "BULLISH";

  const scenarios: TradeScenario[] = [];
  const notes: string[] = [];

  const sellEntry = resistances[0];
  const sellTargets = supports.slice(0, 2);

  const entryIsNear = (level: Level): boolean =>
    Math.abs(level.price - referencePrice) <=
    atrH1 * MAX_ENTRY_DISTANCE_ATR;

  if (sellEntry && !entryIsNear(sellEntry)) {
    notes.push(
      `The nearest resistance (${round(sellEntry.price)}) is too far from price to be an actionable sell plan.`,
    );
  }

  if (sellEntry && entryIsNear(sellEntry) && sellTargets.length > 0) {
    const entry = sellEntry.price;
    const stop = entry + atrH1 * STOP_BUFFER_ATR;

    scenarios.push({
      id: "SELL_REJECTION",
      direction: "SELL",
      title: "Sell on rejection at resistance",
      alignedWithBias: bearish || (!bullish && !bearish),
      condition: `Only if price rallies to about ${round(entry)} and shows rejection (for example a bearish M15 or H1 close back below it). Do not sell into the level blindly.`,
      entry: round(entry),
      stopLoss: round(stop),
      targets: sellTargets.map((level) => round(level.price)),
      riskPoints: round(round(stop) - round(entry)),
      riskReward: sellTargets.map((level) =>
        round(
          (round(entry) - round(level.price)) /
            (round(stop) - round(entry)),
        ),
      ),
      invalidation: `A sustained H1 close above ${round(stop)} means the resistance failed and this plan is invalid.`,
      levelSource: describe(sellEntry),
      distanceToEntryPoints: round(entry - referencePrice),
    });
  }

  const buyEntry = supports[0];
  const buyTargets = resistances.slice(0, 2);

  if (buyEntry && !entryIsNear(buyEntry)) {
    notes.push(
      `The nearest support (${round(buyEntry.price)}) is too far from price to be an actionable buy plan.`,
    );
  }

  if (buyEntry && entryIsNear(buyEntry) && buyTargets.length > 0) {
    const entry = buyEntry.price;
    const stop = entry - atrH1 * STOP_BUFFER_ATR;

    scenarios.push({
      id: "BUY_BOUNCE",
      direction: "BUY",
      title: "Buy on a bounce from support",
      alignedWithBias: bullish || (!bullish && !bearish),
      condition: `Only if price falls to about ${round(entry)} and shows buyers defending it (for example a bullish M15 or H1 close back above it). Do not catch a falling price blindly.`,
      entry: round(entry),
      stopLoss: round(stop),
      targets: buyTargets.map((level) => round(level.price)),
      riskPoints: round(round(entry) - round(stop)),
      riskReward: buyTargets.map((level) =>
        round(
          (round(level.price) - round(entry)) /
            (round(entry) - round(stop)),
        ),
      ),
      invalidation: `A sustained H1 close below ${round(stop)} means the support failed and this plan is invalid.`,
      levelSource: describe(buyEntry),
      distanceToEntryPoints: round(referencePrice - entry),
    });
  }

  // Bias-aligned plan first.
  scenarios.sort(
    (a, b) => Number(b.alignedWithBias) - Number(a.alignedWithBias),
  );

  if (scenarios.length === 0) {
    notes.push(
      "No clear support and resistance pair was found around the current price.",
    );
  }

  if (scenarios.some((scenario) => !scenario.alignedWithBias)) {
    notes.push(
      "A plan marked as against the bias is counter-trend and carries lower probability.",
    );
  }

  return {
    available: scenarios.length > 0,
    referencePrice: round(referencePrice),
    atrH1: round(atrH1),
    bias,
    scenarios,
    notes,
  };
}
