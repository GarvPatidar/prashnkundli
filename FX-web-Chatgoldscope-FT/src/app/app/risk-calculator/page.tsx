"use client";

import { useMemo, useState } from "react";

import {
  AlertTriangle,
  Calculator,
  CircleDollarSign,
  Layers,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  DEFAULT_CONTRACT_SIZE,
  calculateRisk,
  type CalcMode,
  type TradeDirection,
} from "@/features/risk/risk.calc";

function parseNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

const inputShell =
  "mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-base text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";

const adornedShell =
  "mt-2 flex h-12 items-center rounded-xl border border-[var(--border)] bg-white px-4 focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary)]/10";

const labelText = "text-sm font-semibold text-[var(--text)]";

const statCard = "rounded-2xl bg-[var(--surface-soft)] p-4";

const statLabel =
  "text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]";

const statValue = "mt-2 text-xl font-semibold text-[var(--text)]";

export default function Page() {
  const [mode, setMode] = useState<CalcMode>("FIND_LOT");
  const [direction, setDirection] = useState<TradeDirection>("BUY");
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [lotSize, setLotSize] = useState("0.10");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [contractSize, setContractSize] = useState(
    String(DEFAULT_CONTRACT_SIZE),
  );
  const [leverage, setLeverage] = useState("100");

  const result = useMemo(
    () =>
      calculateRisk({
        mode,
        direction,
        balance: parseNumber(accountBalance),
        riskPercent: parseNumber(riskPercent),
        entry: parseNumber(entryPrice),
        stopLoss: parseNumber(stopLoss),
        takeProfit: parseNumber(takeProfit),
        lotSize: parseNumber(lotSize),
        contractSize: parseNumber(contractSize),
        leverage: parseNumber(leverage),
      }),
    [
      mode,
      direction,
      accountBalance,
      riskPercent,
      entryPrice,
      stopLoss,
      takeProfit,
      lotSize,
      contractSize,
      leverage,
    ],
  );

  const riskNumber = parseNumber(riskPercent);

  const highRisk =
    result.valid &&
    result.riskPercentOfBalance !== null &&
    result.riskPercentOfBalance > 2;

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--background)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="surface p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Calculator size={22} aria-hidden="true" />
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                POSITION SIZE & RISK
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)]">
                Risk Calculator
              </h1>

              <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-muted)]">
                Get the exact lot size for your risk, or enter a lot size to
                see your potential profit and loss on an XAU/USD trade.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="surface p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Trade details
            </h2>

            {/* Mode */}
            <div className="mt-5">
              <p className={labelText}>I want to</p>

              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-soft)] p-1">
                {(
                  [
                    ["FIND_LOT", "Find my lot size"],
                    ["KNOWN_LOT", "I know my lot size"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={
                      mode === value
                        ? "min-h-10 rounded-lg bg-white text-sm font-semibold text-[var(--primary)] shadow-[var(--shadow-sm)]"
                        : "min-h-10 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div className="mt-5">
              <p className={labelText}>Direction</p>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection("BUY")}
                  className={
                    direction === "BUY"
                      ? "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] text-sm font-semibold text-[var(--success)]"
                      : "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                  }
                >
                  <TrendingUp size={18} aria-hidden="true" />
                  BUY
                </button>

                <button
                  type="button"
                  onClick={() => setDirection("SELL")}
                  className={
                    direction === "SELL"
                      ? "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] text-sm font-semibold text-[var(--danger)]"
                      : "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)]"
                  }
                >
                  <TrendingDown size={18} aria-hidden="true" />
                  SELL
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelText}>Account balance</span>

                <div className={adornedShell}>
                  <span className="mr-2 text-[var(--text-muted)]">$</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={accountBalance}
                    onChange={(event) =>
                      setAccountBalance(event.target.value)
                    }
                    className="w-full bg-transparent text-base text-[var(--text)] outline-none"
                  />
                </div>
              </label>

              {mode === "FIND_LOT" ? (
                <label className="block">
                  <span className={labelText}>Risk per trade</span>

                  <div className={adornedShell}>
                    <input
                      type="number"
                      min="0.01"
                      step="0.1"
                      value={riskPercent}
                      onChange={(event) =>
                        setRiskPercent(event.target.value)
                      }
                      className="w-full bg-transparent text-base text-[var(--text)] outline-none"
                    />

                    <span className="ml-2 text-[var(--text-muted)]">%</span>
                  </div>
                </label>
              ) : (
                <label className="block">
                  <span className={labelText}>Lot size</span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={lotSize}
                    onChange={(event) => setLotSize(event.target.value)}
                    placeholder="e.g. 0.10"
                    className={inputShell}
                  />
                </label>
              )}
            </div>

            {mode === "FIND_LOT" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {[0.5, 1, 2].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRiskPercent(String(value))}
                    className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/25 hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                  >
                    {value}%
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4">
              <label className="block">
                <span className={labelText}>Entry price</span>

                <input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(event) => setEntryPrice(event.target.value)}
                  placeholder="e.g. 4116.92"
                  className={inputShell}
                />
              </label>

              <label className="block">
                <span className={labelText}>Stop loss</span>

                <input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(event) => setStopLoss(event.target.value)}
                  placeholder={
                    direction === "BUY"
                      ? "Below entry price"
                      : "Above entry price"
                  }
                  className={inputShell}
                />
              </label>

              <label className="block">
                <span className={labelText}>
                  Take profit
                  <span className="ml-1 font-normal text-[var(--text-subtle)]">
                    optional
                  </span>
                </span>

                <input
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(event) => setTakeProfit(event.target.value)}
                  placeholder={
                    direction === "BUY"
                      ? "Above entry price"
                      : "Below entry price"
                  }
                  className={inputShell}
                />
              </label>
            </div>

            {/* Broker settings */}
            <details className="mt-6 rounded-2xl border border-[var(--border)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                Broker settings
                <span className="ml-1 font-normal text-[var(--text-subtle)]">
                  contract size & leverage
                </span>
              </summary>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelText}>Contract size (oz / lot)</span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={contractSize}
                    onChange={(event) =>
                      setContractSize(event.target.value)
                    }
                    className={inputShell}
                  />
                </label>

                <label className="block">
                  <span className={labelText}>Leverage (1 : X)</span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={leverage}
                    onChange={(event) => setLeverage(event.target.value)}
                    className={inputShell}
                  />
                </label>
              </div>

              <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                Most brokers use 100 oz per lot for XAU/USD. Check your
                broker&apos;s contract specification if yours differs.
              </p>
            </details>
          </section>

          <section className="surface h-fit p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
                <ShieldCheck size={20} aria-hidden="true" />
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
                    {result.message}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Headline: lot size */}
                <div className="mt-5 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5">
                  <div className="flex items-center gap-2 text-[var(--primary-strong)]">
                    <Layers size={16} aria-hidden="true" />

                    <span className="text-xs font-semibold uppercase tracking-[0.08em]">
                      {result.mode === "FIND_LOT"
                        ? "Recommended lot size"
                        : "Your lot size"}
                    </span>
                  </div>

                  <p className="mt-2 text-3xl font-semibold text-[var(--primary-strong)]">
                    {result.lotSize.toFixed(2)}{" "}
                    <span className="text-base font-medium">lots</span>
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {(
                      result.lotSize *
                      (parseNumber(contractSize) ?? DEFAULT_CONTRACT_SIZE)
                    ).toFixed(0)}{" "}
                    oz exposure
                  </p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className={statCard}>
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <CircleDollarSign size={16} aria-hidden="true" />
                      <span className={statLabel}>Potential loss</span>
                    </div>

                    <p className={`${statValue} text-[var(--danger)]`}>
                      {formatMoney(result.potentialLoss)}
                    </p>

                    {result.riskPercentOfBalance !== null ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {result.riskPercentOfBalance.toFixed(2)}% of balance
                      </p>
                    ) : null}
                  </div>

                  <div className={statCard}>
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <TrendingUp size={16} aria-hidden="true" />
                      <span className={statLabel}>Potential profit</span>
                    </div>

                    <p className={`${statValue} text-[var(--success)]`}>
                      {result.potentialProfit !== null
                        ? formatMoney(result.potentialProfit)
                        : "Add TP"}
                    </p>

                    {result.rewardDistance !== null &&
                    result.rewardPips !== null ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {result.rewardDistance.toFixed(2)} pts (
                        {result.rewardPips.toFixed(0)} pips)
                      </p>
                    ) : null}
                  </div>

                  <div className={statCard}>
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                      <Target size={16} aria-hidden="true" />
                      <span className={statLabel}>SL distance</span>
                    </div>

                    <p className={statValue}>
                      {result.stopDistance.toFixed(2)}
                    </p>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {result.stopPips.toFixed(0)} pips
                    </p>
                  </div>

                  <div className={statCard}>
                    <p className={statLabel}>Risk : Reward</p>

                    <p className={statValue}>
                      {result.riskReward !== null
                        ? `1 : ${result.riskReward.toFixed(2)}`
                        : "Add TP"}
                    </p>
                  </div>

                  {result.marginRequired !== null ? (
                    <div className={`${statCard} sm:col-span-2 lg:col-span-1 xl:col-span-2`}>
                      <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <Wallet size={16} aria-hidden="true" />
                        <span className={statLabel}>Margin required</span>
                      </div>

                      <p className={statValue}>
                        {formatMoney(result.marginRequired)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {result.notes.map((note) => (
                  <p
                    key={note}
                    className="mt-3 text-xs leading-5 text-[var(--text-muted)]"
                  >
                    {note}
                  </p>
                ))}

                {highRisk || (riskNumber !== null && riskNumber > 2) ? (
                  <div className="mt-4 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4">
                    <div className="flex gap-3">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--warning)]"
                        aria-hidden="true"
                      />

                      <p className="text-sm leading-6 text-[var(--text-secondary)]">
                        This trade risks more than 2% of your account balance.
                        Review whether that matches your trading plan.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--text-muted)]">
              Estimates use a standard {parseNumber(contractSize) ?? DEFAULT_CONTRACT_SIZE} oz
              contract and ignore spread, commission and slippage. Always
              confirm against your broker&apos;s platform before placing a
              trade.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
