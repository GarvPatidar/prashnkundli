/**
 * Replays the PRODUCTION decision engine (`decide`) over cached history and
 * measures the BUY/SELL plans it would have shown a user.
 *
 *   npm run backtest:decision
 *
 * Uses backtest-data/*.json from `npm run backtest -- --refresh` (no API calls).
 * Stateless (no hysteresis), news blackout applied, London+NY hours only.
 * Plans must trigger within 4h (same as the live signal tracker) and are
 * followed for 24h. Same-candle stop+target counts as a stop.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { confluenceService } from "../modules/analysis/confluence.service.js";
import { multiTimeframeService } from "../modules/analysis/multi-timeframe.service.js";
import type { MarketIntelligenceResult } from "../modules/analysis/market-intelligence.service.js";
import { activeBlackout } from "../modules/calendar/static-calendar.js";
import { decide, type Horizon } from "../modules/decision/decision.service.js";
import type { Candle } from "../modules/indicators/indicator.types.js";

type Tf = "m15" | "h1" | "h4" | "d1";
const MS: Record<Tf, number> = { m15: 15 * 60_000, h1: 3_600_000, h4: 14_400_000, d1: 86_400_000 };
const WINDOW = 300;
const STEP = 4; // every hour
const ENTRY_WAIT = 16; // 4h
const HOLD = 96; // 24h
const HORIZONS: Horizon[] = ["SCALP", "INTRADAY", "SWING"];

const load = (tf: Tf): Candle[] => JSON.parse(readFileSync(`backtest-data/${tf}.json`, "utf8")) as Candle[];
const m15 = load("m15"), h1 = load("h1"), h4 = load("h4"), d1 = load("d1");

const closedUpTo = (arr: Candle[], tf: Tf, t: number): number => {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (Date.parse((arr[mid] as Candle).timestamp) + MS[tf] <= t) lo = mid + 1; else hi = mid;
  }
  return lo;
};

interface Stat { plans: number; entered: number; tp1: number; stop: number; open: number; sumR: number; }
const stats = new Map<string, Stat>();
const get = (k: string): Stat => {
  const s = stats.get(k) ?? { plans: 0, entered: 0, tp1: 0, stop: 0, open: 0, sumR: 0 };
  stats.set(k, s);
  return s;
};

function simulate(from: number, p: { direction: "BUY" | "SELL"; entry: number; stopLoss: number; tp1: number }, keys: string[]): void {
  const stat = keys.map(get);
  stat.forEach((s) => (s.plans += 1));
  const buy = p.direction === "BUY";
  let trig = -1;
  for (let j = from; j < Math.min(m15.length, from + ENTRY_WAIT); j++) {
    const c = m15[j] as Candle;
    if (buy ? c.low <= p.entry : c.high >= p.entry) { trig = j; break; }
  }
  if (trig < 0) return;
  stat.forEach((s) => (s.entered += 1));
  const risk = Math.abs(p.entry - p.stopLoss);
  for (let j = trig; j < Math.min(m15.length, trig + HOLD); j++) {
    const c = m15[j] as Candle;
    const stopHit = buy ? c.low <= p.stopLoss : c.high >= p.stopLoss;
    const tpHit = buy ? c.high >= p.tp1 : c.low <= p.tp1;
    if (stopHit) { stat.forEach((s) => { s.stop += 1; s.sumR -= 1; }); return; }
    if (tpHit) { stat.forEach((s) => { s.tp1 += 1; s.sumR += Math.abs(p.tp1 - p.entry) / risk; }); return; }
  }
  stat.forEach((s) => (s.open += 1));
}

let moments = 0;
const verdicts = new Map<string, number>();
const first = Date.parse((m15[WINDOW] as Candle).timestamp);
const last = Date.parse((m15[m15.length - 1] as Candle).timestamp);
const mid = first + (last - first) / 2;

for (let i = WINDOW; i < m15.length - HOLD - ENTRY_WAIT; i += STEP) {
  const t = Date.parse((m15[i] as Candle).timestamp) + MS.m15;
  const hour = new Date(t).getUTCHours();
  if (hour < 7 || hour >= 21) continue;
  const e = { h1: closedUpTo(h1, "h1", t), h4: closedUpTo(h4, "h4", t), d1: closedUpTo(d1, "d1", t) };
  if (e.h1 < WINDOW || e.h4 < WINDOW || e.d1 < 250) continue;

  let analysis;
  try {
    analysis = multiTimeframeService.calculate({
      m15: m15.slice(i + 1 - WINDOW, i + 1),
      h1: h1.slice(e.h1 - WINDOW, e.h1),
      h4: h4.slice(e.h4 - WINDOW, e.h4),
      d1: d1.slice(Math.max(0, e.d1 - WINDOW), e.d1),
    });
  } catch { continue; }

  const confluence = confluenceService.calculate(analysis.snapshots);
  const result = {
    symbol: "XAUUSD",
    primaryTimeframe: "M15",
    marketAnalysis: analysis,
    confluence,
    summary: { bias: confluence.finalBias } as MarketIntelligenceResult["summary"],
  } as unknown as MarketIntelligenceResult;

  moments += 1;
  const now = new Date(t);
  const half = t < mid ? "1st half" : "2nd half";

  for (const horizon of HORIZONS) {
    const d = decide({ result, horizon, now, livePrice: (m15[i] as Candle).close, newsBlackout: activeBlackout(now) });
    verdicts.set(`${horizon} ${d.action}`, (verdicts.get(`${horizon} ${d.action}`) ?? 0) + 1);
    if ((d.action !== "BUY" && d.action !== "SELL") || !d.plan) continue;
    const p = { direction: d.action, entry: d.plan.entry, stopLoss: d.plan.stopLoss, tp1: d.plan.targets[0] as number };
    simulate(i + 1, p, [
      `${horizon} | ALL`,
      `${horizon} | ${d.action}`,
      `${horizon} | ${d.conviction} conviction`,
      `${horizon} | ${d.action} ${half}`,
    ]);
  }
}

const pct = (a: number, b: number) => (b === 0 ? "-" : `${((a / b) * 100).toFixed(1)}%`);
const out = [
  "# GoldScope decision-engine backtest (production `decide`)", "",
  `Range: ${(m15[0] as Candle).timestamp} -> ${(m15[m15.length - 1] as Candle).timestamp}. ${moments} hourly moments (London+NY).`,
  "Plan must trigger within 4h; followed 24h; same-candle stop+target = stop. R = reward/risk multiples.", "",
  "## Verdict mix", "", ...[...verdicts.entries()].sort().map(([k, v]) => `- ${k}: ${v}`), "",
  "## Plan results", "",
  "| Bucket | Plans | Entered | TP1 | Stop | Open | TP1 rate | Avg R | Total R |", "|---|---|---|---|---|---|---|---|---|",
  ...[...stats.entries()].sort().map(([k, s]) =>
    `| ${k} | ${s.plans} | ${s.entered} | ${s.tp1} | ${s.stop} | ${s.open} | ${pct(s.tp1, s.tp1 + s.stop)} | ${s.entered ? (s.sumR / s.entered).toFixed(2) : "-"} | ${s.sumR.toFixed(1)} |`),
];
writeFileSync("backtest-decision-report.md", out.join("\n"));
console.log(out.join("\n"));
