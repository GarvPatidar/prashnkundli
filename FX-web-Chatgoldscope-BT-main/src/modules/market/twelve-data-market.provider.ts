import { z } from "zod";

import type { MarketProvider } from "./market.provider.js";
import type { MarketSnapshot } from "../../types.js";

import {
  isRateLimitMessage,
  twelveDataBudget,
} from "./twelve-data-budget.js";

const REQUEST_TIMEOUT_MS = 10_000;

/*
 * Fresh snapshots are reused for a short period so that
 * frontend polling, chat orchestration, and simultaneous
 * consumers do not repeatedly hit Twelve Data.
 */
const SNAPSHOT_CACHE_TTL_MS = 30_000;

/*
 * /quote is only needed for "is the market open" and costs a credit,
 * so it is refreshed far less often than the price.
 */
const QUOTE_CACHE_TTL_MS = 5 * 60_000;

/*
 * If Twelve Data temporarily fails, a recent last-known-good
 * snapshot may be returned.
 *
 * We intentionally keep this bounded. Market data older than
 * this must not be silently treated as acceptable live data.
 */
const MAX_STALE_SNAPSHOT_AGE_MS = 120_000;

const priceSchema = z.object({
  price: z.coerce.number().finite(),
});

const quoteSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().optional(),
  exchange: z.string().optional(),

  datetime: z.string().optional(),

  timestamp: z
    .union([
      z.number(),
      z.string(),
    ])
    .optional(),

  last_quote_at: z
    .union([
      z.number(),
      z.string(),
    ])
    .optional(),

  open: z.coerce.number().optional(),
  high: z.coerce.number().optional(),
  low: z.coerce.number().optional(),
  close: z.coerce.number().optional(),

  previous_close:
    z.coerce.number().optional(),

  change:
    z.coerce.number().optional(),

  percent_change:
    z.coerce.number().optional(),

  is_market_open:
    z.boolean().optional(),
});

const providerErrorSchema = z.object({
  status: z.string().optional(),

  code: z
    .union([
      z.number(),
      z.string(),
    ])
    .optional(),

  message: z.string().optional(),
});

interface CachedMarketSnapshot {
  snapshot: MarketSnapshot;
  cachedAt: number;
}

export type TwelveDataMarketProviderErrorCode =
  | "INVALID_CONFIGURATION"
  | "REQUEST_TIMEOUT"
  | "REQUEST_FAILED"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE";

export class TwelveDataMarketProviderError
  extends Error {
  constructor(
    message: string,
    public readonly code:
      TwelveDataMarketProviderErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);

    this.name =
      "TwelveDataMarketProviderError";
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

export class TwelveDataMarketProvider
  implements MarketProvider
{
  private readonly baseUrl: string;

  private cachedSnapshot:
    | CachedMarketSnapshot
    | null = null;

  private cachedQuote:
    | {
        data: z.infer<typeof quoteSchema>;
        cachedAt: number;
      }
    | null = null;

  private inFlightSnapshotRequest:
    | Promise<MarketSnapshot>
    | null = null;

  constructor(
    private readonly apiKey: string,
    baseUrl: string,
  ) {
    if (!apiKey.trim()) {
      throw new TwelveDataMarketProviderError(
        "Twelve Data API key is missing.",
        "INVALID_CONFIGURATION",
      );
    }

    if (!baseUrl.trim()) {
      throw new TwelveDataMarketProviderError(
        "Twelve Data base URL is missing.",
        "INVALID_CONFIGURATION",
      );
    }

    this.baseUrl =
      normalizeBaseUrl(
        baseUrl,
      );
  }

  private async request(
    endpoint: string,
  ): Promise<unknown> {
    const url =
      new URL(
        `${this.baseUrl}/${endpoint}`,
      );

    url.searchParams.set(
      "symbol",
      "XAU/USD",
    );

    url.searchParams.set(
      "apikey",
      this.apiKey,
    );

    await twelveDataBudget.acquire(endpoint);

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
        throw new TwelveDataMarketProviderError(
          "Twelve Data returned a non-JSON response.",
          "INVALID_PROVIDER_RESPONSE",
          error,
        );
      }

      const providerError =
        providerErrorSchema.safeParse(
          payload,
        );

      if (
        providerError.success &&
        isRateLimitMessage(
          providerError.data.message,
        )
      ) {
        twelveDataBudget.reportRateLimited(
            providerError.data.message,
          );
      }

      if (
        !response.ok ||
        (
          providerError.success &&
          providerError.data.status ===
            "error"
        )
      ) {
        throw new TwelveDataMarketProviderError(
          providerError.success
            ? providerError.data
                .message ??
              "Twelve Data request failed."
            : "Twelve Data request failed.",
          "PROVIDER_ERROR",
          payload,
        );
      }

      return payload;
    } catch (error) {
      if (
        error instanceof
        TwelveDataMarketProviderError
      ) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new TwelveDataMarketProviderError(
          "Twelve Data request timed out.",
          "REQUEST_TIMEOUT",
          error,
        );
      }

      throw new TwelveDataMarketProviderError(
        "Twelve Data request failed.",
        "REQUEST_FAILED",
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private isFreshSnapshot(
    cached:
      CachedMarketSnapshot,
    now: number,
  ): boolean {
    return (
      now -
        cached.cachedAt <
      SNAPSHOT_CACHE_TTL_MS
    );
  }

  private canUseStaleSnapshot(
    cached:
      CachedMarketSnapshot,
    now: number,
  ): boolean {
    return (
      now -
        cached.cachedAt <=
      MAX_STALE_SNAPSHOT_AGE_MS
    );
  }

  private async getQuote(): Promise<
    z.infer<typeof quoteSchema>
  > {
    const cached = this.cachedQuote;

    if (
      cached &&
      Date.now() - cached.cachedAt <
        QUOTE_CACHE_TTL_MS
    ) {
      return cached.data;
    }

    try {
      const raw =
        await this.request("quote");

      const parsed =
        quoteSchema.safeParse(raw);

      if (!parsed.success) {
        throw new TwelveDataMarketProviderError(
          "Twelve Data quote response did not match the expected schema.",
          "INVALID_PROVIDER_RESPONSE",
          parsed.error.flatten(),
        );
      }

      this.cachedQuote = {
        data: parsed.data,
        cachedAt: Date.now(),
      };

      return parsed.data;
    } catch (error) {
      // A stale market-open flag is better than no price at all.
      if (cached) {
        return cached.data;
      }

      throw error;
    }
  }

  private async fetchSnapshot():
    Promise<MarketSnapshot> {
    /*
     * Price is fetched every refresh. The quote (market-open flag)
     * is cached for minutes to save credits.
     */
    const rawPrice =
      await this.request("price");

    const quoteData =
      await this.getQuote();

    const priceResult =
      priceSchema.safeParse(
        rawPrice,
      );

    if (!priceResult.success) {
      throw new TwelveDataMarketProviderError(
        "Twelve Data price response did not match the expected schema.",
        "INVALID_PROVIDER_RESPONSE",
        priceResult.error.flatten(),
      );
    }

    const price =
      priceResult.data.price;

    /*
     * The price was fetched just now, so that is its timestamp.
     * (The cached quote's own timestamp can be minutes old.)
     */
    const timestamp =
      new Date().toISOString();

    return {
      symbol: "XAUUSD",

      quote: {
        price,

        /*
         * Twelve Data's current quote response
         * for XAU/USD does not supply broker
         * bid/ask values.
         *
         * Never fabricate spread information.
         */
        bid: null,
        ask: null,
        spread: null,

        provider:
          "Twelve Data",

        timestamp,
      },

      session: {
        name:
          quoteData
            .is_market_open !== false
            ? "MARKET_OPEN"
            : "MARKET_CLOSED",

        highLiquidity:
          false,
      },

      indicators: {},

      levels: {},

      generatedAt:
        timestamp,
    };
  }

  private async refreshSnapshot():
    Promise<MarketSnapshot> {
    try {
      const snapshot =
        await this.fetchSnapshot();

      this.cachedSnapshot = {
        snapshot,
        cachedAt:
          Date.now(),
      };

      return snapshot;
    } catch (error) {
      const cached =
        this.cachedSnapshot;

      if (
        cached &&
        this.canUseStaleSnapshot(
          cached,
          Date.now(),
        )
      ) {
        /*
         * Important:
         *
         * Do NOT update cachedAt here.
         *
         * This snapshot remains stale and the
         * next caller will be allowed to attempt
         * another provider refresh.
         */
        return cached.snapshot;
      }

      throw error;
    }
  }

  async getSnapshot():
    Promise<MarketSnapshot> {
    const now =
      Date.now();

    const cached =
      this.cachedSnapshot;

    if (
      cached &&
      this.isFreshSnapshot(
        cached,
        now,
      )
    ) {
      return cached.snapshot;
    }

    /*
     * A refresh may already be in progress.
     *
     * Reuse the same Promise so simultaneous
     * callers do not generate duplicate
     * Twelve Data requests.
     */
    if (
      this.inFlightSnapshotRequest
    ) {
      return (
        this.inFlightSnapshotRequest
      );
    }

    const request =
      this.refreshSnapshot();

    this.inFlightSnapshotRequest =
      request;

    try {
      return await request;
    } finally {
      /*
       * Only clear the request that this call
       * actually created. This guards against
       * future implementation changes where
       * another refresh could theoretically
       * replace the reference.
       */
      if (
        this.inFlightSnapshotRequest ===
        request
      ) {
        this.inFlightSnapshotRequest =
          null;
      }
    }
  }
}