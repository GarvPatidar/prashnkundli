"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Calculator,
  History,
  LogOut,
  MessageSquarePlus,
  Settings,
  X,
} from "lucide-react";


import { cn } from "@/lib/cn";

const links = [
  ["/app/chat", "New Chat", MessageSquarePlus],
  ["/app/market", "Market", BarChart3],
  ["/app/risk-calculator", "Risk calculator", Calculator],
  ["/app/history", "History", History],
  ["/app/settings", "Settings", Settings],
] as const;

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function AppSidebar({
  mobile = false,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

const handleNewChat = () => {
  onNavigate?.();

  router.push(
    `/app/chat?new=${crypto.randomUUID()}`,
  );
};

  const handleLogout = () => {
    window.sessionStorage.clear();
    window.localStorage.clear();

    onNavigate?.();
    router.replace("/login");
  };

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-white",
        !mobile && "hidden lg:flex",
        mobile && "w-full border-r-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
        <div>
          <Link
            href="/"
            onClick={onNavigate}
            className="block text-xl font-bold tracking-tight text-[var(--text)]"
          >
            <span className="text-[var(--primary)]">Gold</span>
            Scope AI
          </Link>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            XAU/USD Trading Copilot
          </p>
        </div>

        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-10 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links.map(([href, label, Icon]) => {
          const isActive =
            pathname === href ||
            (href !== "/app/chat" && pathname.startsWith(`${href}/`));

          if (href === "/app/chat") {
            return (
              <button
                key={href}
                type="button"
                onClick={handleNewChat}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]",
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]",
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--text)]">
            Demo User
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Free Plan
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/25 px-4 py-3 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
        >
          <LogOut size={17} aria-hidden="true" />
          Logout
        </button>

        <p className="mt-4 text-center text-[11px] text-[var(--text-subtle)]">
          GoldScope AI v0.1
        </p>
      </div>
    </aside>
  );
}