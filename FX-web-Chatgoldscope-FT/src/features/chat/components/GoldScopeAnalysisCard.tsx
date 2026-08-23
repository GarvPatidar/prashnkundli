import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CirclePause,
  ShieldAlert,
} from "lucide-react";

import type {
  GoldScopeAnalysis,
  TradeAction,
} from "../types/chat.types";

interface GoldScopeAnalysisCardProps {
  analysis: GoldScopeAnalysis;
}

function formatDecision(
  decision:
    GoldScopeAnalysis["decision"],
): string {
  return decision
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function getActionLabel(
  action: TradeAction,
): string {
  switch (action) {
    case "BUY_SETUP":
      return "Buy setup";

    case "SELL_SETUP":
      return "Sell setup";

    case "WAIT":
      return "Wait for confirmation";

    case "AVOID":
      return "Avoid fresh exposure";
  }
}

function ActionIcon({
  action,
}: {
  action: TradeAction;
}) {
  switch (action) {
    case "BUY_SETUP":
      return (
        <ArrowUpRight
          size={16}
          aria-hidden="true"
        />
      );

    case "SELL_SETUP":
      return (
        <ArrowDownRight
          size={16}
          aria-hidden="true"
        />
      );

    case "WAIT":
      return (
        <CirclePause
          size={16}
          aria-hidden="true"
        />
      );

    case "AVOID":
      return (
        <ShieldAlert
          size={16}
          aria-hidden="true"
        />
      );
  }
}

export function GoldScopeAnalysisCard({
  analysis,
}: GoldScopeAnalysisCardProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)]">
      <div className="border-b border-[var(--border)] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              GoldScope view
            </p>

            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
              {analysis.headline}
            </h2>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {analysis.summary}
            </p>
          </div>

          <span className="rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-strong)]">
            XAU/USD
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Market bias
            </p>

            <p className="mt-2 font-semibold text-[var(--text)]">
              {formatDecision(
                analysis.decision,
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Action right now
            </p>

            <div className="mt-2 flex items-center gap-2 font-semibold text-[var(--text)]">
              <ActionIcon
                action={
                  analysis.action
                }
              />

              {getActionLabel(
                analysis.action,
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Confidence
            </p>

            <p className="mt-2 font-semibold text-[var(--text)]">
              {analysis.confidence ===
              null
                ? "—"
                : `${analysis.confidence}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Market view
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {
              analysis.whatMarketIsShowing
            }
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <AlertTriangle
              size={16}
              className="text-[var(--warning)]"
              aria-hidden="true"
            />

            Primary risk
          </div>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {analysis.primaryRisk}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <CheckCircle2
                size={16}
                className="text-[var(--success)]"
                aria-hidden="true"
              />

              What strengthens the setup
            </div>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {
                analysis.whatWouldStrengthenTheSetup
              }
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <ShieldAlert
                size={16}
                className="text-[var(--danger)]"
                aria-hidden="true"
              />

              What weakens the setup
            </div>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {
                analysis.whatWouldWeakenTheSetup
              }
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--primary-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--primary-strong)]">
            Next step
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {analysis.nextStep}
          </p>
        </div>

        {analysis.traderNote ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Trader note
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {analysis.traderNote}
            </p>
          </div>
        ) : null}

        <p className="border-t border-[var(--border)] pt-4 text-[11px] leading-5 text-[var(--text-subtle)]">
          {analysis.disclaimer}
        </p>
      </div>
    </section>
  );
}