"use client";

import { useEffect, useState } from "react";

import { getMarketSnapshot } from "@/features/market/market.service";
import { describeBias } from "@/features/market/market-bias";
import type { MarketBias } from "@/features/market/market.types";

const REFRESH_INTERVAL_MS = 60_000;

const DIRECTION_STYLE: Record<string, string> = {
  BULLISH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BEARISH: "bg-rose-50 text-rose-700 border-rose-200",
  NEUTRAL: "bg-slate-50 text-slate-600 border-slate-200",
};

/**
 * Real market bias from the backend analysis engine, with the
 * evidence behind it. No hardcoded direction or text.
 */
export function MarketBiasCard() {
  const [bias, setBias] = useState<MarketBias | undefined>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await getMarketSnapshot(controller.signal);

        setBias(response.data.bias);
        setFailed(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setFailed(true);
      } finally {
        setLoading(false);
      }
    }

    void load();

    const id = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      controller.abort();
    };
  }, []);

  const display = describeBias(failed ? undefined : bias);

  return (
    <div className="surface rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            AI Market Direction
          </span>

          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
            Current Trend Bias
          </h2>
        </div>

        <span className={display.className}>
          {loading ? "Analysing…" : display.label}
        </span>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Reading M15, H1, H4 and Daily structure…
        </p>
      ) : !bias || !bias.available || failed ? (
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {failed
            ? "Could not reach the market service."
            : display.detail}{" "}
          No bias is shown until live analysis is available.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {display.detail} · Bull score {bias.bullishScore.toFixed(0)} vs
            bear score {bias.bearishScore.toFixed(0)}
            {bias.stale
              ? " · Data refresh delayed, showing last analysis"
              : ""}
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {bias.timeframes.map((item) => (
              <div
                key={item.timeframe}
                className={`rounded-xl border px-2 py-2 text-center ${
                  DIRECTION_STYLE[item.direction]
                }`}
              >
                <p className="text-[11px] font-semibold">{item.timeframe}</p>

                <p className="mt-0.5 text-xs font-bold">
                  {item.direction === "NEUTRAL"
                    ? "Neutral"
                    : item.direction === "BULLISH"
                      ? "Bullish"
                      : "Bearish"}
                </p>
              </div>
            ))}
          </div>

          {bias.reasons.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Why
              </p>

              <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                {bias.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {bias.conflicts.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--warning)]">
                Conflicting signals
              </p>

              <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                {bias.conflicts.map((conflict) => (
                  <li key={conflict}>• {conflict}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <p className="mt-4 text-xs text-[var(--text-subtle)]">
        Market bias is a technical read, not financial advice or a trade
        signal.
      </p>
    </div>
  );
}
