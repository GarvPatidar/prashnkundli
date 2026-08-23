import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "gold";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const badgeVariants: Record<BadgeTone, string> = {
  neutral:
    "border-[var(--border)] bg-white text-[var(--text-secondary)]",

  success:
    "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]",

  warning:
    "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]",

  info:
    "border-[var(--primary)]/20 bg-[var(--primary-soft)] text-[var(--primary)]",

  gold:
    "border-[var(--gold)]/20 bg-[var(--gold-soft)] text-[var(--gold-strong)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
        badgeVariants[tone],
        className
      )}
    >
      {children}
    </span>
  );
}