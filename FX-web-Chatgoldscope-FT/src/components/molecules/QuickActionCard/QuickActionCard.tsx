import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/cn";

import type {
  QuickActionCardProps,
  QuickActionTone,
} from "./QuickActionCard.types";

const toneStyles: Record<
  QuickActionTone,
  {
    container: string;
    icon: string;
  }
> = {
  primary: {
    container:
      "hover:border-[var(--primary)]/30 hover:bg-[var(--primary-soft)]",
    icon:
      "bg-[var(--primary-soft)] text-[var(--primary)]",
  },

  success: {
    container:
      "hover:border-[var(--success)]/30 hover:bg-[var(--success-soft)]",
    icon:
      "bg-[var(--success-soft)] text-[var(--success)]",
  },

  danger: {
    container:
      "hover:border-[var(--danger)]/30 hover:bg-[var(--danger-soft)]",
    icon:
      "bg-[var(--danger-soft)] text-[var(--danger)]",
  },

  warning: {
    container:
      "hover:border-[var(--warning)]/30 hover:bg-[var(--warning-soft)]",
    icon:
      "bg-[var(--warning-soft)] text-[var(--warning)]",
  },

  neutral: {
    container:
      "hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]",
    icon:
      "bg-[var(--surface-soft)] text-[var(--text-secondary)]",
  },
};

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  meta,
  tone = "primary",
  onClick,
}: QuickActionCardProps) {
  const styles = toneStyles[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex min-h-40 flex-col rounded-2xl border border-[var(--border)] bg-white p-5 text-left shadow-[var(--shadow-sm)] transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        "focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10",
        styles.container,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            styles.icon,
          )}
        >
          <Icon size={20} aria-hidden="true" />
        </span>

        <ArrowUpRight
          size={17}
          className="text-[var(--text-subtle)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--text-secondary)]"
          aria-hidden="true"
        />
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-[var(--text)]">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      {meta ? (
        <p className="mt-auto pt-4 text-xs font-medium text-[var(--text-subtle)]">
          {meta}
        </p>
      ) : null}
    </button>
  );
}