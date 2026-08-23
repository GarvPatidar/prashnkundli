"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Calculator,
  CircleDollarSign,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type TradeDirection =
  | "BUY"
  | "SELL";

function parseNumber(
  value: string,
): number | null {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}

export default function Page() {
  const [
    direction,
    setDirection,
  ] =
    useState<
      TradeDirection
    >(
      "BUY",
    );

  const [
    accountBalance,
    setAccountBalance,
  ] =
    useState(
      "10000",
    );

  const [
    riskPercent,
    setRiskPercent,
  ] =
    useState(
      "1",
    );

  const [
    entryPrice,
    setEntryPrice,
  ] =
    useState("");

  const [
    stopLoss,
    setStopLoss,
  ] =
    useState("");

  const [
    takeProfit,
    setTakeProfit,
  ] =
    useState("");

  const result =
    useMemo(
      () => {
        const balance =
          parseNumber(
            accountBalance,
          );

        const risk =
          parseNumber(
            riskPercent,
          );

        const entry =
          parseNumber(
            entryPrice,
          );

        const stop =
          parseNumber(
            stopLoss,
          );

        const target =
          parseNumber(
            takeProfit,
          );

        const hasBaseValues =
          balance !== null &&
          balance >
            0 &&
          risk !== null &&
          risk >
            0 &&
          entry !== null &&
          stop !== null;

        if (
          !hasBaseValues
        ) {
          return {
            valid:
              false,

            message:
              "Enter your account balance, risk percentage, entry price and stop loss to calculate position risk.",

            riskAmount:
              null,

            stopDistance:
              null,

            rewardDistance:
              null,

            riskReward:
              null,

            potentialProfit:
              null,
          };
        }

        const stopDistance =
          Math.abs(
            entry -
              stop,
          );

        if (
          stopDistance ===
          0
        ) {
          return {
            valid:
              false,

            message:
              "Entry price and stop loss cannot be the same.",

            riskAmount:
              null,

            stopDistance:
              null,

            rewardDistance:
              null,

            riskReward:
              null,

            potentialProfit:
              null,
          };
        }

        if (
          direction ===
            "BUY" &&
          stop >=
            entry
        ) {
          return {
            valid:
              false,

            message:
              "For a BUY position, stop loss should normally be below the entry price.",

            riskAmount:
              null,

            stopDistance:
              null,

            rewardDistance:
              null,

            riskReward:
              null,

            potentialProfit:
              null,
          };
        }

        if (
          direction ===
            "SELL" &&
          stop <=
            entry
        ) {
          return {
            valid:
              false,

            message:
              "For a SELL position, stop loss should normally be above the entry price.",

            riskAmount:
              null,

            stopDistance:
              null,

            rewardDistance:
              null,

            riskReward:
              null,

            potentialProfit:
              null,
          };
        }

        const riskAmount =
          balance *
          (
            risk /
            100
          );

        let rewardDistance:
          number | null =
            null;

        let riskReward:
          number | null =
            null;

        let potentialProfit:
          number | null =
            null;

        if (
          target !== null
        ) {
          const targetIsValid =
            direction ===
              "BUY"
              ? target >
                entry
              : target <
                entry;

          if (
            targetIsValid
          ) {
            rewardDistance =
              Math.abs(
                target -
                  entry,
              );

            riskReward =
              rewardDistance /
              stopDistance;

            potentialProfit =
              riskAmount *
              riskReward;
          }
        }

        return {
          valid:
            true,

          message:
            null,

          riskAmount,

          stopDistance,

          rewardDistance,

          riskReward,

          potentialProfit,
        };
      },
      [
        accountBalance,
        direction,
        entryPrice,
        riskPercent,
        stopLoss,
        takeProfit,
      ],
    );

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--background)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="surface p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Calculator
                size={22}
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                POSITION RISK
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                Risk Calculator
              </h1>

              <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-muted)]">
                Calculate the amount at risk, stop-loss distance and
                estimated risk-to-reward before entering an XAU/USD trade.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="surface p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Trade details
            </h2>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[var(--text)]">
                Direction
              </p>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDirection(
                      "BUY",
                    )
                  }
                  className={
                    direction ===
                    "BUY"
                      ? "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] text-sm font-semibold text-[var(--success)]"
                      : "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                  }
                >
                  <TrendingUp
                    size={18}
                    aria-hidden="true"
                  />
                  BUY
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDirection(
                      "SELL",
                    )
                  }
                  className={
                    direction ===
                    "SELL"
                      ? "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] text-sm font-semibold text-[var(--danger)]"
                      : "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                  }
                >
                  <TrendingDown
                    size={18}
                    aria-hidden="true"
                  />
                  SELL
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Account balance
                </span>

                <div className="mt-2 flex h-12 items-center rounded-xl border border-[var(--border)] bg-white px-4 focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary)]/10">
                  <span className="mr-2 text-[var(--text-muted)]">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      accountBalance
                    }
                    onChange={(
                      event,
                    ) =>
                      setAccountBalance(
                        event.target
                          .value,
                      )
                    }
                    className="w-full bg-transparent text-base text-[var(--text)] outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Risk per trade
                </span>

                <div className="mt-2 flex h-12 items-center rounded-xl border border-[var(--border)] bg-white px-4 focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary)]/10">
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={
                      riskPercent
                    }
                    onChange={(
                      event,
                    ) =>
                      setRiskPercent(
                        event.target
                          .value,
                      )
                    }
                    className="w-full bg-transparent text-base text-[var(--text)] outline-none"
                  />

                  <span className="ml-2 text-[var(--text-muted)]">
                    %
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                0.5,
                1,
                2,
              ].map(
                (
                  value,
                ) => (
                  <button
                    key={
                      value
                    }
                    type="button"
                    onClick={() =>
                      setRiskPercent(
                        String(
                          value,
                        ),
                      )
                    }
                    className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/25 hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                  >
                    {value}%
                  </button>
                ),
              )}
            </div>

            <div className="mt-6 grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Entry price
                </span>

                <input
                  type="number"
                  step="0.01"
                  value={
                    entryPrice
                  }
                  onChange={(
                    event,
                  ) =>
                    setEntryPrice(
                      event.target
                        .value,
                    )
                  }
                  placeholder="e.g. 4608.20"
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Stop loss
                </span>

                <input
                  type="number"
                  step="0.01"
                  value={
                    stopLoss
                  }
                  onChange={(
                    event,
                  ) =>
                    setStopLoss(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    direction ===
                    "BUY"
                      ? "Below entry price"
                      : "Above entry price"
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Take profit
                  <span className="ml-1 font-normal text-[var(--text-subtle)]">
                    optional
                  </span>
                </span>

                <input
                  type="number"
                  step="0.01"
                  value={
                    takeProfit
                  }
                  onChange={(
                    event,
                  ) =>
                    setTakeProfit(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    direction ===
                    "BUY"
                      ? "Above entry price"
                      : "Below entry price"
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                />
              </label>
            </div>
          </section>

          <section className="surface h-fit p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
                <ShieldCheck
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Calculated risk
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Based on the values entered.
                </p>
              </div>
            </div>

            {!result.valid ? (
              <div className="mt-5 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--warning)]"
                    aria-hidden="true"
                  />

                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {
                      result.message
                    }
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <CircleDollarSign
                        size={16}
                        aria-hidden="true"
                      />

                      <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                        Risk amount
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                      {result.riskAmount !==
                      null
                        ? formatMoney(
                            result.riskAmount,
                          )
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Target
                        size={16}
                        aria-hidden="true"
                      />

                      <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                        SL distance
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                      {result.stopDistance !==
                      null
                        ? result.stopDistance.toFixed(
                            2,
                          )
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Risk : Reward
                    </p>

                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                      {result.riskReward !==
                      null
                        ? `1 : ${result.riskReward.toFixed(
                            2,
                          )}`
                        : "Add TP"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Potential profit
                    </p>

                    <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                      {result.potentialProfit !==
                      null
                        ? formatMoney(
                            result.potentialProfit,
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                {parseNumber(
                  riskPercent,
                ) !==
                  null &&
                Number(
                  riskPercent,
                ) >
                  2 ? (
                  <div className="mt-4 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4">
                    <div className="flex gap-3">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--warning)]"
                        aria-hidden="true"
                      />

                      <p className="text-sm leading-6 text-[var(--text-secondary)]">
                        You are risking more than 2% of the
                        entered account balance on this trade.
                        Review whether that level matches your
                        trading plan.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                Position size
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Lot size is intentionally not calculated yet.
                XAU/USD contract size, tick value and execution
                rules can vary by broker. We should connect
                broker/contract specifications before showing a
                position-size number.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}