import { z } from "zod";

import type { Candle } from "../indicators/indicator.types.js";
import type {
  CandleProvider,
  GetCandlesInput,
  MarketTimeframe,
} from "./candle.provider.js";

const REQUEST_TIMEOUT_MS = 12_000;

/*
 * Candle data does not need to be re-downloaded
 * for every chat request.
 *
 * Shorter timeframes refresh more frequently.
 */
const CACHE_TTL_MS: Record<
  MarketTimeframe,
  number
> = {
  M15: 30_000,
  H1: 60_000,
  H4: 120_000,
  D1: 300_000,
};

/*
 * If Twelve Data temporarily fails, we may reuse
 * recent last-known-good candle history.
 *
 * This is intentionally bounded so the analysis
 * cannot silently rely on extremely stale data.
 */
const MAX_STALE_AGE_MS: Record<
  MarketTimeframe,
  number
> = {
  M15: 120_000,
  H1: 300_000,
  H4: 600_000,
  D1: 900_000,
};

const TIMEFRAME_INTERVAL_MAP: Record<
  MarketTimeframe,
  string
> = {
  M15: "15min",
  H1: "1h",
  H4: "4h",
  D1: "1day",
};

const timeSeriesValueSchema = z.object({
  datetime: z.string().min(1),

  open: z.coerce.number().finite(),

  high: z.coerce.number().finite(),

  low: z.coerce.number().finite(),

  close: z.coerce.number().finite(),

  volume: z
    .union([
      z.string(),
      z.number(),
    ])
    .optional()
    .nullable(),
});

const successfulTimeSeriesSchema = z.object({
  status: z.literal("ok"),

  values: z
    .array(timeSeriesValueSchema)
    .min(1),

  meta: z
    .record(
      z.string(),
      z.unknown(),
    )
    .optional(),
});

const apiErrorSchema = z.object({
  status: z
    .string()
    .optional(),

  code: z
    .union([
      z.number(),
      z.string(),
    ])
    .optional(),

  message: z
    .string()
    .optional(),
});

interface CachedCandleHistory {
  candles: Candle[];
  cachedAt: number;
}

export type TwelveDataCandleProviderErrorCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_LIMIT"
  | "REQUEST_TIMEOUT"
  | "REQUEST_FAILED"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE";

export class TwelveDataCandleProviderError
  extends Error {
  constructor(
    message: string,
    public readonly code:
      TwelveDataCandleProviderErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);

    this.name =
      "TwelveDataCandleProviderError";
  }
}

function normalizeBaseUrl(
  baseUrl: string,
): string {
  return baseUrl.replace(
    /\/+$/,
    "",
  );
}

function validateLimit(
  limit: number,
): void {
  if (
    !Number.isInteger(limit) ||
    limit < 2 ||
    limit > 5_000
  ) {
    throw new TwelveDataCandleProviderError(
      "Candle limit must be an integer between 2 and 5000.",
      "INVALID_LIMIT",
    );
  }
}

function parseVolume(
  value:
    | string
    | number
    | null
    | undefined,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function toIsoTimestamp(
  value: string,
): string {
  /*
   * Twelve Data may return:
   *
   * 2026-08-19 04:30:00
   * or
   * 2026-08-18
   *
   * We normalize both formats.
   *
   * Important:
   * This currently treats provider timestamps as UTC.
   * Later we can explicitly use provider timezone
   * metadata if required.
   */
  const normalized =
    value.includes(" ")
      ? value.replace(" ", "T")
      : `${value}T00:00:00`;

  const timestamp =
    normalized.endsWith("Z")
      ? normalized
      : `${normalized}Z`;

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new TwelveDataCandleProviderError(
      `Invalid Twelve Data candle timestamp: ${value}`,
      "INVALID_PROVIDER_RESPONSE",
    );
  }

  return date.toISOString();
}

function mapCandle(
  value: z.infer<
    typeof timeSeriesValueSchema
  >,
): Candle {
  if (
    value.high <
      Math.max(
        value.open,
        value.close,
      ) ||
    value.low >
      Math.min(
        value.open,
        value.close,
      ) ||
    value.high < value.low
  ) {
    throw new TwelveDataCandleProviderError(
      "Twelve Data returned an invalid OHLC candle.",
      "INVALID_PROVIDER_RESPONSE",
    );
  }

  return {
    timestamp:
      toIsoTimestamp(
        value.datetime,
      ),

    open:
      value.open,

    high:
      value.high,

    low:
      value.low,

    close:
      value.close,

    volume:
      parseVolume(
        value.volume,
      ),
  };
}

function createCacheKey(
  input: GetCandlesInput,
): string {
  return [
    input.symbol,
    input.timeframe,
    input.limit,
  ].join(":");
}

export class TwelveDataCandleProvider
  implements CandleProvider
{
  private readonly baseUrl: string;

  private readonly candleCache =
    new Map<
      string,
      CachedCandleHistory
    >();

  private readonly inFlightRequests =
    new Map<
      string,
      Promise<Candle[]>
    >();

  constructor(
    private readonly apiKey: string,
    baseUrl: string,
  ) {
    if (!apiKey.trim()) {
      throw new TwelveDataCandleProviderError(
        "Twelve Data API key is missing.",
        "INVALID_CONFIGURATION",
      );
    }

    if (!baseUrl.trim()) {
      throw new TwelveDataCandleProviderError(
        "Twelve Data base URL is missing.",
        "INVALID_CONFIGURATION",
      );
    }

    this.baseUrl =
      normalizeBaseUrl(
        baseUrl,
      );
  }

  private isFresh(
    cached:
      CachedCandleHistory,
    timeframe:
      MarketTimeframe,
    now: number,
  ): boolean {
    return (
      now -
        cached.cachedAt <
      CACHE_TTL_MS[
        timeframe
      ]
    );
  }

  private canUseStale(
    cached:
      CachedCandleHistory,
    timeframe:
      MarketTimeframe,
    now: number,
  ): boolean {
    return (
      now -
        cached.cachedAt <=
      MAX_STALE_AGE_MS[
        timeframe
      ]
    );
  }

  private async requestCandles(
    input: GetCandlesInput,
  ): Promise<Candle[]> {
    const interval =
      TIMEFRAME_INTERVAL_MAP[
        input.timeframe
      ];

    const symbol =
      input.symbol === "XAUUSD"
        ? "XAU/USD"
        : input.symbol;

    const url =
      new URL(
        `${this.baseUrl}/time_series`,
      );

    url.searchParams.set(
      "symbol",
      symbol,
    );

    url.searchParams.set(
      "interval",
      interval,
    );

    url.searchParams.set(
      "outputsize",
      input.limit.toString(),
    );

    url.searchParams.set(
      "apikey",
      this.apiKey,
    );

    /*
     * We request UTC so every timeframe uses
     * one normalized timezone internally.
     */
    url.searchParams.set(
      "timezone",
      "UTC",
    );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        REQUEST_TIMEOUT_MS,
      );

    try {
      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },

            signal:
              controller.signal,
          },
        );

      let payload: unknown;

      try {
        payload =
          await response.json();
      } catch (error) {
        throw new TwelveDataCandleProviderError(
          "Twelve Data returned a non-JSON response.",
          "INVALID_PROVIDER_RESPONSE",
          error,
        );
      }

      if (!response.ok) {
        const providerError =
          apiErrorSchema.safeParse(
            payload,
          );

        throw new TwelveDataCandleProviderError(
          providerError.success
            ? providerError.data
                .message ??
              `Twelve Data request failed with HTTP ${response.status}.`
            : `Twelve Data request failed with HTTP ${response.status}.`,
          "REQUEST_FAILED",
          payload,
        );
      }

      const providerError =
        apiErrorSchema.safeParse(
          payload,
        );

      if (
        providerError.success &&
        providerError.data.status ===
          "error"
      ) {
        throw new TwelveDataCandleProviderError(
          providerError.data
            .message ??
            "Twelve Data returned a provider error.",
          "PROVIDER_ERROR",
          payload,
        );
      }

      const parsed =
        successfulTimeSeriesSchema.safeParse(
          payload,
        );

      if (!parsed.success) {
        throw new TwelveDataCandleProviderError(
          "Twelve Data response did not match the expected candle schema.",
          "INVALID_PROVIDER_RESPONSE",
          parsed.error.flatten(),
        );
      }

      /*
       * Twelve Data returns newest-first.
       *
       * Our indicator engine receives
       * oldest → newest chronological candles.
       */
      return parsed.data.values
        .map(mapCandle)
        .reverse();
    } catch (error) {
      if (
        error instanceof
        TwelveDataCandleProviderError
      ) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new TwelveDataCandleProviderError(
          "Twelve Data candle request timed out.",
          "REQUEST_TIMEOUT",
          error,
        );
      }

      throw new TwelveDataCandleProviderError(
        "Twelve Data candle request failed.",
        "REQUEST_FAILED",
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async refreshCandles(
    input: GetCandlesInput,
    cacheKey: string,
  ): Promise<Candle[]> {
    try {
      const candles =
        await this.requestCandles(
          input,
        );

      this.candleCache.set(
        cacheKey,
        {
          candles,
          cachedAt:
            Date.now(),
        },
      );

      return candles;
    } catch (error) {
      const cached =
        this.candleCache.get(
          cacheKey,
        );

      if (
        cached &&
        this.canUseStale(
          cached,
          input.timeframe,
          Date.now(),
        )
      ) {
        /*
         * Do not update cachedAt here.
         *
         * The data remains stale, allowing the
         * next request to attempt a provider
         * refresh again.
         */
        return cached.candles;
      }

      throw error;
    }
  }

  async getCandles(
    input: GetCandlesInput,
  ): Promise<Candle[]> {
    validateLimit(
      input.limit,
    );

    const cacheKey =
      createCacheKey(
        input,
      );

    const now =
      Date.now();

    const cached =
      this.candleCache.get(
        cacheKey,
      );

    if (
      cached &&
      this.isFresh(
        cached,
        input.timeframe,
        now,
      )
    ) {
      return cached.candles;
    }

    /*
     * Reuse an existing refresh for the exact
     * same symbol/timeframe/limit combination.
     */
    const existingRequest =
      this.inFlightRequests.get(
        cacheKey,
      );

    if (existingRequest) {
      return existingRequest;
    }

    const request =
      this.refreshCandles(
        input,
        cacheKey,
      );

    this.inFlightRequests.set(
      cacheKey,
      request,
    );

    try {
      return await request;
    } finally {
      if (
        this.inFlightRequests.get(
          cacheKey,
        ) === request
      ) {
        this.inFlightRequests.delete(
          cacheKey,
        );
      }
    }
  }
}