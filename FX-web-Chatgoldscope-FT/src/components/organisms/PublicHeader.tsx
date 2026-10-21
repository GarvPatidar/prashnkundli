import Link from "next/link";
import { Menu } from "lucide-react";

import { LinkButton } from "@/components/marketing/LinkButton";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Why GoldScope" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#070b14]/80 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-[var(--mk-text)]"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-b from-[#ffd76a] to-[#e0a62a] text-sm font-black text-[#1a1306]">
            Au
          </span>
          <span>
            Gold<span className="text-[var(--mk-gold)]">Scope</span> AI
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--mk-muted)] md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--mk-text)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-3 text-sm font-medium text-[var(--mk-muted)] transition-colors hover:text-[var(--mk-text)] sm:inline"
          >
            Sign in
          </Link>

          <LinkButton href="/signup">Start free</LinkButton>

          <details className="relative md:hidden">
            <summary
              aria-label="Open menu"
              className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--mk-text)]"
            >
              <Menu size={19} aria-hidden="true" />
            </summary>

            <div className="absolute right-0 top-14 w-56 rounded-2xl border border-white/10 bg-[#0e1627] p-2 shadow-2xl">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-[var(--mk-text)] hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="block rounded-lg px-3 py-2.5 text-sm text-[var(--mk-text)] hover:bg-white/5"
              >
                Sign in
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
