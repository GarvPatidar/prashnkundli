"use client";

import { MarketStrip } from "@/components/molecules/MarketStrip";

export default function Page() {
  return (
    <div className="overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Market Header */}
        <div className="surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                  Live Market
                </span>
              </div>

              <h1 className="text-2xl font-semibold text-[var(--text)]">
                XAU/USD Market
              </h1>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Current gold price, quote conditions, market direction
                and trading session information.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-muted)]"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Market Data */}
        <MarketStrip />

        {/* Market Direction / Bias Overview Card (Freemium Ready) */}
        <div className="surface p-6 border border-[var(--border)] rounded-2xl bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                AI Market Direction
              </span>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
                Current Trend Bias
              </h2>
            </div>
            {/* Bias Status Pill */}
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              🟢 Bullish Bias (Active)
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Multi-timeframe structure (M15, H1, Daily) shows buyer-controlled momentum. 
            Key support levels are holding firm during the London session.
          </p>

          {/* Premium Lock Teaser / Banner (For Future Monetization) */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-4 py-3 text-xs">
            <span className="font-medium text-[var(--primary-strong)]">
              🔒 Unlock advanced institutional order flow & real-time liquidity traps with GoldScope Pro.
            </span>
            <span className="font-bold underline cursor-pointer text-[var(--primary)]">
              Upgrade
            </span>
          </div>
        </div>

        {/* Market Information */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="surface p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              Trading Session
            </div>

            <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">
              Global Gold Market
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              The active trading session is
              calculated automatically from the
              major global market time zones.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                Sydney
              </span>

              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                Tokyo
              </span>

              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                London
              </span>

              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                New York
              </span>
            </div>
          </div>

          <div className="surface p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
              Data Provider
            </div>

            <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">
              Twelve Data
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              The displayed XAU/USD price is
              supplied by the configured market-data
              provider.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)]">
              <span className="size-1.5 rounded-full bg-current" />
              Live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}