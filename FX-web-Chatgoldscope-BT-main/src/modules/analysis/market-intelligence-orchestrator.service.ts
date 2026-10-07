import { candleProvider } from "../market/candle.factory.js";
import { buildHistorySummary } from "./history-summary.js";
import { buildTradeScenarios } from "./trade-scenarios.js";

import {
  marketIntelligenceService,
  type MarketIntelligenceResult,
} from "./market-intelligence.service.js";

const DEFAULT_CANDLE_LIMIT =
  300;

/*
 * One analysis is shared by every chat request
 * and by the /market/snapshot bias badge.
 *
 * Without this, every chat message triggered four
 * Twelve Data candle requests and quickly hit the
 * provider rate limit, which made the AI answer
 * "market intelligence is temporarily unavailable".
 */
const INTELLIGENCE_CACHE_TTL_MS =
  45_000;

/*
 * If the provider fails we may keep serving the last
 * good analysis for a bounded time. It is flagged as
 * stale so the UI and AI never present it as live.
 */
const INTELLIGENCE_MAX_STALE_MS =
  10 * 60_000;

const PROVIDER_RETRY_DELAY_MS =
  1_500;

export interface CachedMarketIntelligence {
  result: MarketIntelligenceResult;
  fetchedAt: number;
  stale: boolean;
  ageMs: number;
}

/**
 * Walks error.cause so the REAL failure is visible, e.g.
 *   MarketIntelligenceOrchestratorError: ... could not be generated.
 *   <- MarketIntelligenceServiceError: ...
 *   <- CandleValidationError: Duplicate candle timestamp detected. (code=DUPLICATE_TIMESTAMP, candle #212)
 */
function describeErrorChain(
  error: unknown,
): string {
  const parts: string[] = [];
  let current: unknown = error;

  for (
    let depth = 0;
    depth < 8 && current !== undefined && current !== null;
    depth++
  ) {
    if (current instanceof Error) {
      const extra = current as Error & {
        code?: unknown;
        candleIndex?: unknown;
      };

      const details = [
        extra.code !== undefined
          ? `code=${String(extra.code)}`
          : null,
        extra.candleIndex !== undefined
          ? `candle #${String(extra.candleIndex)}`
          : null,
      ].filter(Boolean);

      parts.push(
        `${current.name}: ${current.message}${
          details.length > 0
            ? ` (${details.join(", ")})`
            : ""
        }`,
      );

      current = (current as Error & { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }

  return parts.join("\n   <- ");
}

interface RawCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

/**
 * Real provider data has small glitches (duplicate bars,
 * out-of-order bars, high/low a hair inside open/close,
 * negative volume). The indicator engine is strict and
 * rejects the WHOLE analysis on any of them, so we repair
 * what is safely repairable and drop what is not.
 */
function sanitizeCandles<T extends RawCandle>(
  candles: readonly T[],
  label: string,
): T[] {
  const byTimestamp = new Map<number, T>();
  let dropped = 0;
  let repaired = 0;

  for (const candle of candles) {
    const time = Date.parse(candle.timestamp);

    const prices = [
      candle.open,
      candle.high,
      candle.low,
      candle.close,
    ];

    if (
      !Number.isFinite(time) ||
      prices.some(
        (price) =>
          !Number.isFinite(price) || price <= 0,
      )
    ) {
      dropped++;
      continue;
    }

    const high = Math.max(...prices);
    const low = Math.min(...prices);

    const volume =
      candle.volume !== null &&
      (!Number.isFinite(candle.volume) ||
        candle.volume < 0)
        ? null
        : candle.volume;

    if (
      high !== candle.high ||
      low !== candle.low ||
      volume !== candle.volume
    ) {
      repaired++;
    }

    // Same timestamp twice: keep the latest one.
    byTimestamp.set(time, {
      ...candle,
      high,
      low,
      volume,
    });
  }

  const cleaned = [...byTimestamp.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, candle]) => candle);

  const duplicates =
    candles.length - dropped - cleaned.length;

  if (dropped > 0 || repaired > 0 || duplicates > 0) {
    console.warn(
      `[market-intelligence] ${label} candles cleaned: dropped=${dropped}, repaired=${repaired}, duplicates=${duplicates}`,
    );
  }

  return cleaned;
}

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

export interface GenerateMarketIntelligenceInput {
  symbol?: "XAUUSD";

  candleLimit?: number;
}

export type MarketIntelligenceOrchestratorErrorCode =
  | "INVALID_CANDLE_LIMIT"
  | "MARKET_DATA_FETCH_FAILED"
  | "MARKET_INTELLIGENCE_GENERATION_FAILED";

export class MarketIntelligenceOrchestratorError
  extends Error {
  constructor(
    message: string,

    public readonly code:
      MarketIntelligenceOrchestratorErrorCode,

    public readonly cause?: unknown,
  ) {
    super(message);

    this.name =
      "MarketIntelligenceOrchestratorError";
  }
}

function validateCandleLimit(
  candleLimit: number,
): void {
  if (
    !Number.isInteger(
      candleLimit,
    ) ||
    candleLimit < 250 ||
    candleLimit > 1_000
  ) {
    throw new MarketIntelligenceOrchestratorError(
      "Candle limit must be an integer between 250 and 1000.",
      "INVALID_CANDLE_LIMIT",
    );
  }
}

function getCurrentSessionM15Candles<
  T extends {
    timestamp: string;
  },
>(
  candles: readonly T[],
): T[] {
  if (
    candles.length === 0
  ) {
    return [];
  }

  /*
   * For now use the latest UTC trading day.
   *
   * Later this can be replaced by the dedicated
   * Asia / London / New York session engine.
   */
  const latestCandle =
    candles[
      candles.length - 1
    ];

  if (
    !latestCandle
  ) {
    return [];
  }

  const latestDate =
    latestCandle.timestamp.slice(
      0,
      10,
    );

  return candles.filter(
    (
      candle,
    ) =>
      candle.timestamp.slice(
        0,
        10,
      ) === latestDate,
  );
}

export class MarketIntelligenceOrchestratorService {
  async generate(
    input:
      GenerateMarketIntelligenceInput = {},
  ): Promise<MarketIntelligenceResult> {
    const symbol =
      input.symbol ??
      "XAUUSD";

    const candleLimit =
      input.candleLimit ??
      DEFAULT_CANDLE_LIMIT;

    validateCandleLimit(
      candleLimit,
    );

    let m15Candles;
    let h1Candles;
    let h4Candles;
    let d1Candles;

    try {
      [
        m15Candles,
        h1Candles,
        h4Candles,
        d1Candles,
      ] = await Promise.all([
        candleProvider.getCandles({
          symbol,

          timeframe:
            "M15",

          limit:
            candleLimit,
        }),

        candleProvider.getCandles({
          symbol,

          timeframe:
            "H1",

          limit:
            candleLimit,
        }),

        candleProvider.getCandles({
          symbol,

          timeframe:
            "H4",

          limit:
            candleLimit,
        }),

        candleProvider.getCandles({
          symbol,

          timeframe:
            "D1",

          limit:
            candleLimit,
        }),
      ]);
    } catch (error) {
      throw new MarketIntelligenceOrchestratorError(
        "XAU/USD market data could not be fetched.",
        "MARKET_DATA_FETCH_FAILED",
        error,
      );
    }

    try {
      m15Candles = sanitizeCandles(m15Candles, "M15");
      h1Candles = sanitizeCandles(h1Candles, "H1");
      h4Candles = sanitizeCandles(h4Candles, "H4");
      d1Candles = sanitizeCandles(d1Candles, "D1");

      const currentSessionM15 =
        getCurrentSessionM15Candles(
          m15Candles,
        );

      const analysed = marketIntelligenceService.analyse({
        m15:
          m15Candles,

        h1:
          h1Candles,

        h4:
          h4Candles,

        d1:
          d1Candles,

        ...(currentSessionM15.length >
        0
          ? {
              currentSessionM15,
            }
          : {}),
      });

      return {
        ...analysed,
        history: buildHistorySummary(d1Candles),
        tradeScenarios: buildTradeScenarios(analysed),
      };
    } catch (error) {
      throw new MarketIntelligenceOrchestratorError(
        "XAU/USD market intelligence could not be generated.",
        "MARKET_INTELLIGENCE_GENERATION_FAILED",
        error,
      );
    }
  }

  private cache:
    | {
        result: MarketIntelligenceResult;
        fetchedAt: number;
      }
    | null = null;

  private inFlight:
    Promise<MarketIntelligenceResult> | null =
      null;

  private async generateWithRetry():
    Promise<MarketIntelligenceResult> {
    try {
      return await this.generate({
        symbol: "XAUUSD",
        candleLimit:
          DEFAULT_CANDLE_LIMIT,
      });
    } catch (firstError) {
      if (
        !(
          firstError instanceof
          MarketIntelligenceOrchestratorError
        ) ||
        firstError.code !==
          "MARKET_DATA_FETCH_FAILED"
      ) {
        throw firstError;
      }

      /*
       * Most failures are provider rate limits or
       * short network problems. One delayed retry
       * recovers from those without hammering the API.
       */
      await sleep(
        PROVIDER_RETRY_DELAY_MS,
      );

      return this.generate({
        symbol: "XAUUSD",
        candleLimit:
          DEFAULT_CANDLE_LIMIT,
      });
    }
  }

  /**
   * Cached, de-duplicated market intelligence.
   *
   * Throws only when there is no usable analysis at all
   * (provider failed AND no last-known-good result that is
   * younger than INTELLIGENCE_MAX_STALE_MS).
   */
  async getLatest():
    Promise<CachedMarketIntelligence> {
    const now = Date.now();
    const cached = this.cache;

    if (
      cached &&
      now - cached.fetchedAt <
        INTELLIGENCE_CACHE_TTL_MS
    ) {
      return {
        result: cached.result,
        fetchedAt: cached.fetchedAt,
        stale: false,
        ageMs: now - cached.fetchedAt,
      };
    }

    if (!this.inFlight) {
      this.inFlight =
        this.generateWithRetry().finally(
          () => {
            this.inFlight = null;
          },
        );
    }

    try {
      const result =
        await this.inFlight;

      this.cache = {
        result,
        fetchedAt: Date.now(),
      };

      return {
        result,
        fetchedAt:
          this.cache.fetchedAt,
        stale: false,
        ageMs: 0,
      };
    } catch (error) {
      /*
       * This used to be swallowed silently, then logged only the
       * outer message. Print the whole cause chain.
       */
      console.error(
        "[market-intelligence] refresh failed:\n   " +
          describeErrorChain(error),
      );

      const fallback = this.cache;
      const failedAt = Date.now();

      if (
        fallback &&
        failedAt - fallback.fetchedAt <=
          INTELLIGENCE_MAX_STALE_MS
      ) {
        return {
          result: fallback.result,
          fetchedAt:
            fallback.fetchedAt,
          stale: true,
          ageMs:
            failedAt -
            fallback.fetchedAt,
        };
      }

      throw error;
    }
  }
}

export const marketIntelligenceOrchestrator =
  new MarketIntelligenceOrchestratorService();