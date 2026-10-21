import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#050810]">
      <div className="container-shell py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <p className="text-lg font-bold text-[var(--mk-text)]">
              Gold<span className="text-[var(--mk-gold)]">Scope</span> AI
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--mk-muted)]">
              The AI copilot built only for XAU/USD traders.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-[var(--mk-text)]">Product</p>
              <Link className="block text-[var(--mk-muted)] hover:text-[var(--mk-text)]" href="/#how-it-works">How it works</Link>
              <Link className="block text-[var(--mk-muted)] hover:text-[var(--mk-text)]" href="/pricing">Pricing</Link>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-[var(--mk-text)]">Account</p>
              <Link className="block text-[var(--mk-muted)] hover:text-[var(--mk-text)]" href="/signup">Create account</Link>
              <Link className="block text-[var(--mk-muted)] hover:text-[var(--mk-text)]" href="/login">Sign in</Link>
              <Link className="block text-[var(--mk-muted)] hover:text-[var(--mk-text)]" href="/risk-disclosure">Risk disclosure</Link>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-white/[0.07] pt-6 text-xs leading-5 text-[var(--mk-muted)]">
          GoldScope AI is decision-support software, not financial advice. It
          does not execute trades or guarantee returns. Trading gold and
          leveraged products carries a high risk of loss.
        </p>
      </div>
    </footer>
  );
}
