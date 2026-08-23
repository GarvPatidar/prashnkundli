import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/atoms/Button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold tracking-[-0.02em] text-[var(--text)]"
        >
          <span className="text-[var(--primary)]">Gold</span>
          Scope AI
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--text-muted)] md:flex">
          <Link
            href="/features"
            className="transition-colors hover:text-[var(--text)]"
          >
            Features
          </Link>

          <Link
            href="/how-it-works"
            className="transition-colors hover:text-[var(--text)]"
          >
            How it works
          </Link>

          <Link
            href="/pricing"
            className="transition-colors hover:text-[var(--text)]"
          >
            Pricing
          </Link>
        </nav>

        <Link href="/app/chat">
          <Button>
            Open copilot
            <ArrowRight className="ml-2" size={16} aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </header>
  );
}