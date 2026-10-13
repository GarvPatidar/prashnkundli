/**
 * Evidence harness: replays the LIVE engine over history and reports how often
 * its bias and trade scenarios were actually right.
 *
 *   npm run backtest               (uses cached data if present)
 *   npm run backtest -- --refresh  (re-download, costs 4 Twelve Data credits)
 *
 * Reads TWELVE_DATA_API_KEY from the environment directly. Writes
 * backtest-data/*.json (cache) and backtest-report.md / backtest-report.json.
 * Nothing here is imported by the server.
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import type { Candle } from "../modules/indicators/indicator.types.js";
import {
  confluenceService,
  type ConfluenceResult,
  type ConfluenceWeights,
} from "../modules/analysis/confluence.service.js";
import { multiTimeframeService } from "../modules/analysis/multi-timeframe.service.js";
import type { MarketIntelligenceResult } from "../modules/analysis/market-intelligence.service.js";
import { buildTradeScenarios } from "../modules/analysis/trade-scenarios.js";

type Tf = "m15" | "h1" | "h4" | "d1";

const TF_CONFIG: Record<Tf, { interval: string; ms: number }> = {
  m15: { interval: "15min", ms: 15 * 60_000 },
  h1: { interval: "1h", ms: 60 * 60_000 },
  h4: { interval: "4h", ms: 4 * 60 * 60_000 },
  d1: { interval: "1day", ms: 24 * 60 * 60_000 },
};

const WINDOW = 300;
const STEP_M15 = 8; // evaluate every 2 hours
const HORIZONS = [16, 32, 96]; // 4h, 8h, 24h in M15 candles
const ENTRY_WAIT = 96; // scenario entry must trigger within 24h
const TRADE_TIMEOUT = 96; // trade resolved within 24h of trigger
const STOP_BUFFERS = [0.5, 1.0, 1.5];

const VARIANTS: Record<string, ConfluenceWeights> = {
  "current (M15-heavy)": { M15: 0.35, H1: 0.3, H4: 0.25, D1: 0.1 },
  "balanced": { M15: 0.2, H1: 0.3, H4: 0.3, D1: 0.2 },
  "top-down (H4/D1-heavy)": { M15: 0.1, H1: 0.25, H4: 0.35, D1: 0.3 },
  "higher-tf only": { M15: 0, H1: 0.2, H4: 0.4, D1: 0.4 },
};

const DATA_DIR = "backtest-data";

function parseDatetime(value: string): string {
  const text = value.length === 10 ? `${value} 00:00:00` : value;
  return `${text.replace(" ", "T")}Z`;
}

async function fetchTf(tf: Tf, apiKey: string): Promise<Candle[]> {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", "XAU/USD");
  url.searchParams.set("interval", TF_CONFIG[tf].interval);
  url.searchParams.set("outputsize", "5000");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url);
  const body = (await response.json()) as {
    status?: string;
    message?: string;
    values?: Array<Record<string, string>>;
  };

  if (!response.ok || body.status === "error" || !body.values) {
    throw new Error(`Twelve Data ${tf}: ${body.message ?? response.statusText}`);
  }

  return body.values
    .map((v) => ({
      timestamp: parseDatetime(v.datetime as string),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: v.volume !== undefined && v.volume !== "" ? Number(v.volume) : null,
    }))
    .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function loadData(): Promise<Record<Tf, Candle[]>> {
  const refresh = process.argv.includes("--refresh");
  mkdirSync(DATA_DIR, { recursive: true });
  const out = {} as Record<Tf, Candle[]>;

  for (const tf of Object.keys(TF_CONFIG) as Tf[]) {
    const file = `${DATA_DIR}/${tf}.json`;

    if (!refresh && existsSync(file)) {
      out[tf] = JSON.parse(readFileSync(file, "utf8")) as Candle[];
      continue;
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) throw new Error("TWELVE_DATA_API_KEY is not set.");

    console.log(`Downloading ${tf}…`);
    out[tf] = await fetchTf(tf, apiKey);
    writeFileSync(file, JSON.stringify(out[tf]));
    // stay under 8 requests/minute
    await new Promise((r) => setTimeout(r, 9000));
  }

  return out;
}

export const sign = (bias: string): 1 | -1 | 0 =>
  bias.includes("BULLISH") ? 1 : bias.includes("BEARISH") ? -1 : 0;

interface Counter {
  n: number;
  hits: number;
  sumPoints: number;
}

const newCounter = (): Counter => ({ n: 0, hits: 0, sumPoints: 0 });

function add(map: Map<string, Counter>, key: string, points: number): void {
  const c = map.get(key) ?? newCounter();
  c.n += 1;
  c.hits += points > 0 ? 1 : 0;
  c.sumPoints += points;
  map.set(key, c);
}

const bucket = (confidence: number): string =>
  confidence >= 80 ? "80+" : confidence >= 60 ? "60-79" : confidence >= 40 ? "40-59" : "<40";

interface TradeStat {
  n: number;
  entered: number;
  tp1: number;
  stop: number;
  open: number;
  sumR: number;
}

const newTrade = (): TradeStat => ({ n: 0, entered: 0, tp1: 0, stop: 0, open: 0, sumR: 0 });

/** Conservative: if stop and target are hit in the same candle, the stop counts first. */
function simulate(
  m15: Candle[],
  from: number,
  s: { direction: "BUY" | "SELL"; entry: number; stopLoss: number; targets: number[] },
  stat: TradeStat,
): void {
  stat.n += 1;
  const buy = s.direction === "BUY";
  let triggered = -1;

  for (let j = from; j < Math.min(m15.length, from + ENTRY_WAIT); j++) {
    const c = m15[j] as Candle;
    if (buy ? c.low <= s.entry : c.high >= s.entry) {
      triggered = j;
      break;
    }
  }
  if (triggered < 0) return;

  stat.entered += 1;
  const risk = Math.abs(s.entry - s.stopLoss);
  const tp1 = s.targets[0] as number;

  for (let j = triggered; j < Math.min(m15.length, triggered + TRADE_TIMEOUT); j++) {
    const c = m15[j] as Candle;
    const stopHit = buy ? c.low <= s.stopLoss : c.high >= s.stopLoss;
    const tpHit = buy ? c.high >= tp1 : c.low <= tp1;

    if (stopHit) {
      stat.stop += 1;
      stat.sumR -= 1;
      return;
    }
    if (tpHit) {
      stat.tp1 += 1;
      stat.sumR += Math.abs(tp1 - s.entry) / risk;
      return;
    }
  }
  stat.open += 1;
}

const pct = (a: number, b: number): string => (b === 0 ? "-" : `${((a / b) * 100).toFixed(1)}%`);

async function main(): Promise<void> {
  const data = await loadData();
  const { m15, h1, h4, d1 } = data;
  console.log(
    `Candles: M15 ${m15.length}, H1 ${h1.length}, H4 ${h4.length}, D1 ${d1.length}`,
  );

  const closedUpTo = (arr: Candle[], tf: Tf, t: number): number => {
    // index (exclusive) of candles fully closed at time t
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const closeTime = Date.parse((arr[mid] as Candle).timestamp) + TF_CONFIG[tf].ms;
      if (closeTime <= t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const maxH = Math.max(...HORIZONS);
  const startIndex = Math.max(WINDOW, 1);
  const bias = new Map<string, Map<string, Counter>>();
  const trades = new Map<string, TradeStat>();
  let baseUp = 0;
  let baseN = 0;
  let steps = 0;
  let failures = 0;

  for (let i = startIndex; i < m15.length - maxH - ENTRY_WAIT; i += STEP_M15) {
    const t = Date.parse((m15[i] as Candle).timestamp) + TF_CONFIG.m15.ms;
    const hour = new Date(t).getUTCHours();
    if (hour < 7 || hour >= 21) continue; // London + New York only

    const ends = {
      h1: closedUpTo(h1, "h1", t),
      h4: closedUpTo(h4, "h4", t),
      d1: closedUpTo(d1, "d1", t),
    };
    if (ends.h1 < WINDOW || ends.h4 < WINDOW || ends.d1 < 250) continue;

    let analysis;
    try {
      analysis = multiTimeframeService.calculate({
        m15: m15.slice(i + 1 - WINDOW, i + 1),
        h1: h1.slice(ends.h1 - WINDOW, ends.h1),
        h4: h4.slice(ends.h4 - WINDOW, ends.h4),
        d1: d1.slice(Math.max(0, ends.d1 - WINDOW), ends.d1),
      });
    } catch {
      failures += 1;
      continue;
    }
    steps += 1;

    const close0 = (m15[i] as Candle).close;
    for (const h of HORIZONS) {
      baseN += 1;
      if ((m15[i + h] as Candle).close > close0) baseUp += 1;
    }

    for (const [name, weights] of Object.entries(VARIANTS)) {
      const confluence: ConfluenceResult = confluenceService.calculate(
        analysis.snapshots,
        { weights },
      );
      const dir = sign(confluence.finalBias);
      const variantMap = bias.get(name) ?? new Map<string, Counter>();
      bias.set(name, variantMap);

      if (dir !== 0) {
        for (const h of HORIZONS) {
          const points = dir * ((m15[i + h] as Candle).close - close0);
          const label = `${h * 15 / 60}h`;
          add(variantMap, `ALL | ${label}`, points);
          add(variantMap, `${dir === 1 ? "BUY" : "SELL"} | ${label}`, points);
          add(variantMap, `conf ${bucket(confluence.confidence)} | ${label}`, points);
          add(variantMap, `${confluence.finalBias} | ${label}`, points);
        }
      } else {
        variantMap.set("NEUTRAL (no call)", {
          ...(variantMap.get("NEUTRAL (no call)") ?? newCounter()),
          n: (variantMap.get("NEUTRAL (no call)")?.n ?? 0) + 1,
          hits: 0,
          sumPoints: 0,
        });
      }

      const fake = {
        symbol: "XAUUSD",
        primaryTimeframe: "M15",
        marketAnalysis: analysis,
        confluence,
        summary: { bias: confluence.finalBias } as MarketIntelligenceResult["summary"],
      } as unknown as MarketIntelligenceResult;

      for (const buffer of STOP_BUFFERS) {
        const set = buildTradeScenarios(fake, { stopBufferAtr: buffer });
        for (const s of set.scenarios) {
          const key = `${name} | stop ${buffer} ATR | ${s.alignedWithBias && dir !== 0 ? "with-bias" : dir === 0 ? "neutral-bias" : "counter-bias"} | ${s.direction}`;
          const stat = trades.get(key) ?? newTrade();
          trades.set(key, stat);
          simulate(m15, i + 1, s, stat);
        }
      }
    }
  }

  const lines: string[] = [];
  lines.push("# GoldScope backtest report", "");
  lines.push(
    `Range: ${(m15[0] as Candle).timestamp} → ${(m15[m15.length - 1] as Candle).timestamp}`,
    `Evaluated ${steps} moments (London+NY hours, every 2h). Skipped ${failures}.`,
    `Baseline: price closed higher in ${pct(baseUp, baseN)} of cases (a coin-flip is ~50%).`,
    "",
    "Hit = price moved in the direction of the bias. Points = average move in the bias direction (USD/oz).",
    "Overlapping samples are not independent, so treat small differences as noise.",
    "",
  );

  for (const [name, map] of bias) {
    lines.push(`## Bias accuracy: ${name}`, "", "| Bucket | Calls | Hit rate | Avg points |", "|---|---|---|---|");
    for (const [key, c] of [...map.entries()].sort()) {
      const neutral = key.startsWith("NEUTRAL");
      lines.push(`| ${key.replaceAll(" | ", " / ")} | ${c.n} | ${neutral ? "-" : pct(c.hits, c.n)} | ${neutral ? "-" : (c.sumPoints / c.n).toFixed(2)} |`);
    }
    lines.push("");
  }

  lines.push("## Trade scenarios (TP1 vs stop, conservative on same-candle)", "");
  lines.push("| Variant / stop / alignment / side | Plans | Entered | TP1 | Stop | Open | TP1 rate | Avg R |", "|---|---|---|---|---|---|---|---|");
  for (const [key, s] of [...trades.entries()].sort()) {
    const closed = s.tp1 + s.stop;
    lines.push(`| ${key.replaceAll(" | ", " / ")} | ${s.n} | ${s.entered} | ${s.tp1} | ${s.stop} | ${s.open} | ${pct(s.tp1, closed)} | ${s.entered ? (s.sumR / s.entered).toFixed(2) : "-"} |`);
  }

  writeFileSync("backtest-report.md", lines.join("\n"));
  writeFileSync(
    "backtest-report.json",
    JSON.stringify({ bias: Object.fromEntries([...bias].map(([k, v]) => [k, Object.fromEntries(v)])), trades: Object.fromEntries(trades) }, null, 2),
  );
  console.log(lines.join("\n"));
  console.log("\nSaved backtest-report.md and backtest-report.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
