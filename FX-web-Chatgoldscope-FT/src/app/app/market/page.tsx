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
                Current gold price, quote conditions
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