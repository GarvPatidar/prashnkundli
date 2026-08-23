"use client";

import { Check, LoaderCircle, Sparkles } from "lucide-react";

interface AnalysisProgressProps {
  completedSteps: string[];
  currentStep: string;
  totalSteps: number;
}

export function AnalysisProgress({
  completedSteps,
  currentStep,
  totalSteps,
}: AnalysisProgressProps) {
  const completedCount = Math.min(completedSteps.length, totalSteps);
  const progressPercentage =
    totalSteps > 0
      ? Math.min(96, Math.round((completedCount / totalSteps) * 100))
      : 10;

  return (
    <section className="max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-sm)] md:p-5">
      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Sparkles size={18} aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text)]">
            GoldScope is preparing your analysis
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Processing the available market context and your trading situation.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {completedSteps.slice(-3).map((step) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-xl bg-[var(--success-soft)] px-3 py-2.5"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
              <Check size={12} strokeWidth={3} aria-hidden="true" />
            </span>

            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {step}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-3 py-2.5">
          <LoaderCircle
            size={18}
            className="shrink-0 animate-spin text-[var(--primary)]"
            aria-hidden="true"
          />

          <span className="text-xs font-semibold text-[var(--primary-strong)]">
            {currentStep}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-[var(--text-subtle)]">
          <span>Analysis in progress</span>
          <span>{progressPercentage}%</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </section>
  );
}