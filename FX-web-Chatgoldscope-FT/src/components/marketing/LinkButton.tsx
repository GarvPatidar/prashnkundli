import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: "gold" | "outline";
  size?: "md" | "lg";
  className?: string;
}

export function LinkButton({
  href,
  children,
  variant = "gold",
  size = "md",
  className,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f5c451]/30",
        size === "lg" ? "min-h-[52px] px-7 text-base" : "min-h-11 px-5 text-sm",
        variant === "gold"
          ? "bg-gradient-to-b from-[#ffd76a] to-[#e0a62a] text-[#1a1306] shadow-[0_10px_30px_-8px_rgba(245,196,81,0.6)] hover:-translate-y-0.5 hover:brightness-105"
          : "border border-white/15 bg-white/5 text-[var(--mk-text)] hover:bg-white/10",
        className,
      )}
    >
      {children}
    </Link>
  );
}
