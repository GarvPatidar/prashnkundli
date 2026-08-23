"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { MarketStrip } from "@/components/molecules/MarketStrip";
import { AppSidebar } from "@/components/organisms/AppSidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)]">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isMobileMenuOpen}
            className="flex size-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            <Menu size={21} aria-hidden="true" />
          </button>

          <p className="text-base font-bold tracking-tight text-[var(--text)]">
            <span className="text-[var(--primary)]">Gold</span>
            Scope AI
          </p>

          <span
            aria-hidden="true"
            className="size-10"
          />
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MarketStrip />
          {children}
        </main>
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[400] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <div className="absolute inset-y-0 left-0 w-[min(86vw,320px)] shadow-[var(--shadow-lg)]">
            <AppSidebar
              mobile
              onNavigate={closeMobileMenu}
              onClose={closeMobileMenu}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}