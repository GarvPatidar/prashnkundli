"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  History,
  MessageSquare,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/cn";

const navigationItems = [
  {
    href: "/app/chat",
    label: "Chat",
    icon: MessageSquare,
  },
  {
    href: "/app/market",
    label: "Market",
    icon: BarChart3,
  },
  {
    href: "/app/risk-calculator",
    label: "Risk",
    icon: Calculator,
  },
  {
    href: "/app/history",
    label: "History",
    icon: History,
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: Settings,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile application navigation"
      className="shrink-0 border-t border-[var(--border)] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/app/chat" && pathname.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors",
                isActive
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]",
              )}
            >
              <Icon size={19} aria-hidden="true" />

              <span className="w-full truncate text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}