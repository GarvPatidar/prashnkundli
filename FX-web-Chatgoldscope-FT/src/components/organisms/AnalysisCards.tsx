import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import type { AnalysisResponse } from "@/types/market";

type AnalysisCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: "default" | "warning" | "success" | "danger" | "info";
};

const toneStyles: Record<
  NonNullable<AnalysisCardProps["tone"]>,
  string
> = {
  default:
    "border-[var(--border)] bg-white",
  warning:
    "border-[var(--warning)]/20 bg-[var(--warning-soft)]",
  success:
    "border-[var(--success)]/20 bg-[var(--success-soft)]",
  danger:
    "border-[var(--danger)]/20 bg-[var(--danger-soft)]",
  info:
    "border-[var(--primary)]/20 bg-[var(--primary-soft)]",
};

function AnalysisCard({
  title,
  icon,
  children,
  tone = "default",
}: AnalysisCardProps) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-[var(--shadow-sm)] ${toneStyles[tone]}`}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
        {icon}
        <span>{title}</span>
      </div>

      <div className="text-sm leading-6 text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

type AnalysisCardsProps = {
  analysis: AnalysisResponse;
};

export function AnalysisCards({ analysis }: AnalysisCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <AnalysisCard
        title="Market condition"
        tone="info"
        icon={
          <CheckCircle2
            size={17}
            className="text-[var(--primary)]"
            aria-hidden="true"
          />
        }
      >
        {analysis.marketCondition}
      </AnalysisCard>

      <AnalysisCard
        title="Main risk"
        tone="warning"
        icon={
          <AlertTriangle
            size={17}
            className="text-[var(--warning)]"
            aria-hidden="true"
          />
        }
      >
        {analysis.mainRisk}
      </AnalysisCard>

      <AnalysisCard
        title="Bullish conditions"
        tone="success"
        icon={
          <ArrowUpRight
            size={17}
            className="text-[var(--success)]"
            aria-hidden="true"
          />
        }
      >
        {analysis.bullishScenario}
      </AnalysisCard>

      <AnalysisCard
        title="Bearish conditions"
        tone="danger"
        icon={
          <ArrowDownRight
            size={17}
            className="text-[var(--danger)]"
            aria-hidden="true"
          />
        }
      >
        {analysis.bearishScenario}
      </AnalysisCard>

      <AnalysisCard
        title="Position assessment"
        tone="info"
        icon={
          <ShieldAlert
            size={17}
            className="text-[var(--primary)]"
            aria-hidden="true"
          />
        }
      >
        {analysis.positionStatus}
      </AnalysisCard>

      <AnalysisCard
        title="Next safer step"
        icon={
          <CheckCircle2
            size={17}
            className="text-[var(--gold)]"
            aria-hidden="true"
          />
        }
      >
        {analysis.nextStep}
      </AnalysisCard>
    </div>
  );
}