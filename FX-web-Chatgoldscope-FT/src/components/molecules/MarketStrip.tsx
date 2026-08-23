"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/atoms/Badge";

import {
  getMarketSnapshot,
} from "@/features/market/market.service";

import type {
  MarketSnapshot,
} from "@/features/market/market.types";

const REFRESH_INTERVAL_MS = 30_000;
/**
 * Determines the active major trading session
 * using the user's current browser time.
 *
 * No additional market API is required.
 *
 * London:
 * 08:00 - 17:00 local London time
 *
 * New York:
 * 08:00 - 17:00 local New York time
 *
 * Tokyo:
 * 09:00 - 18:00 local Tokyo time
 *
 * Sydney:
 * 09:00 - 18:00 local Sydney time
 */
function getTradingSession(): string {
  const now = new Date();

  const getHour = (
    timeZone: string,
  ): number => {
    const formatter =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone,
          hour: "numeric",
          hour12: false,
        },
      );

    return Number(
      formatter.format(now),
    );
  };

  const londonHour =
    getHour("Europe/London");

  const newYorkHour =
    getHour("America/New_York");

  const tokyoHour =
    getHour("Asia/Tokyo");

  const sydneyHour =
    getHour("Australia/Sydney");

  const londonOpen =
    londonHour >= 8 &&
    londonHour < 17;

  const newYorkOpen =
    newYorkHour >= 8 &&
    newYorkHour < 17;

  const tokyoOpen =
    tokyoHour >= 9 &&
    tokyoHour < 18;

  const sydneyOpen =
    sydneyHour >= 9 &&
    sydneyHour < 18;

  if (
    londonOpen &&
    newYorkOpen
  ) {
    return "LONDON / NEW YORK";
  }

  if (londonOpen) {
    return "LONDON";
  }

  if (newYorkOpen) {
    return "NEW YORK";
  }

  if (tokyoOpen) {
    return "TOKYO";
  }

  if (sydneyOpen) {
    return "SYDNEY";
  }

  return "MARKET CLOSED";
}

export function MarketStrip() {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<MarketSnapshot | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    tradingSession,
    setTradingSession,
  ] = useState(
    "MARKET CLOSED",
  );

  const requestInFlightRef =
    useRef(false);

  const loadSnapshot =
    useCallback(
      async (
        signal?: AbortSignal,
        background = false,
      ) => {
        if (
          requestInFlightRef.current
        ) {
          return;
        }

        requestInFlightRef.current =
          true;

        try {
          if (background) {
            setIsRefreshing(true);
          } else {
            setIsLoading(true);
          }

          const response =
            await getMarketSnapshot(
              signal,
            );

          setSnapshot(
            response.data,
          );

          setTradingSession(
            getTradingSession(),
          );

          setError("");
        } catch (
          requestError
        ) {
          if (
            requestError instanceof
              DOMException &&
            requestError.name ===
              "AbortError"
          ) {
            return;
          }

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Market data is currently unavailable.",
          );
        } finally {
          requestInFlightRef.current =
            false;

          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    const initialLoadId =
      window.setTimeout(
        () => {
          void loadSnapshot(
            controller.signal,
          );
        },
        0,
      );

    const intervalId =
      window.setInterval(
        () => {
          void loadSnapshot(
            controller.signal,
            true,
          );
        },
        REFRESH_INTERVAL_MS,
      );

    return () => {
      window.clearTimeout(
        initialLoadId,
      );

      window.clearInterval(
        intervalId,
      );

      controller.abort();
    };
  }, [loadSnapshot]);

  /**
   * Update the displayed session
   * independently from the API refresh.
   *
   * This means the session can change
   * from London -> New York without
   * requiring another market API.
   */
  useEffect(() => {
    const updateSession =
      () => {
        setTradingSession(
          getTradingSession(),
        );
      };

    updateSession();

    const intervalId =
      window.setInterval(
        updateSession,
        60_000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, []);

  if (
    isLoading &&
    !snapshot
  ) {
    return (
      <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-white px-4 text-sm text-[var(--text-muted)]">
        <LoaderCircle
          size={16}
          className="animate-spin text-[var(--primary)]"
          aria-hidden="true"
        />

        Loading XAU/USD market context…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm">
        <AlertCircle
          size={17}
          className="text-[var(--danger)]"
          aria-hidden="true"
        />

        <span className="text-[var(--danger)]">
          {error ||
            "Market data is unavailable."}
        </span>

        <button
          type="button"
          onClick={() =>
            void loadSnapshot()
          }
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-white/50"
        >
          <RefreshCw
            size={14}
            aria-hidden="true"
          />

          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-[var(--border)] bg-white px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
      {/* Symbol */}
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary-strong)]">
          AU
        </span>

        <strong className="text-[var(--text)]">
          {snapshot.symbol ===
          "XAUUSD"
            ? "XAU/USD"
            : snapshot.symbol}
        </strong>
      </div>

      {/* Price */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">
          Price
        </span>

        <b className="font-semibold text-[var(--text)]">
          {snapshot.quote.price.toFixed(
            2,
          )}
        </b>
      </div>

      {/* Session */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-muted)]">
          Session
        </span>

        <span className="font-semibold text-[var(--text-secondary)]">
          {tradingSession}
        </span>
      </div>

      {/* Live status */}
      <Badge tone="success">
        <Wifi
          size={12}
          className="mr-1"
          aria-hidden="true"
        />

        Live market
      </Badge>

      {isRefreshing ? (
        <LoaderCircle
          size={14}
          className="animate-spin text-[var(--text-subtle)]"
          aria-label="Refreshing market data"
        />
      ) : null}

      {/* Provider */}
            {error ? (
        <span className="w-full text-xs text-[var(--warning)]">
          Refresh failed. Showing
          the most recent available
          snapshot.
        </span>
      ) : null}
    </div>
  );
}