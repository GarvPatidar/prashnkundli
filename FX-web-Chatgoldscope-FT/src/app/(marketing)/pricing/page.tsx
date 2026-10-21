import type { Metadata } from "next";
import { Check, Gift, Minus } from "lucide-react";

import { LinkButton } from "@/components/marketing/LinkButton";
import { PlanCards } from "@/components/marketing/PlanCards";
import { FREE_FIRST_CHAT, PLANS } from "@/config/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "GoldScope AI plans start at $8 a month. Your first chat is free, no card required.",
};

const [plus, pro, advance] = PLANS;

const COMPARISON: ReadonlyArray<{
  label: string;
  values: readonly [string | boolean, string | boolean, string | boolean, string | boolean];
}> = [
  {
    label: "AI analyses",
    values: [`${FREE_FIRST_CHAT.messagesPerChat} messages (one chat)`, `${plus.limits.analysesPerMonth} / month`, `${pro.limits.analysesPerMonth} / month`, `${advance.limits.analysesPerMonth} / month`],
  },
  {
    label: "Screenshots per message",
    values: ["1", `${plus.limits.screenshotsPerMessage}`, `${pro.limits.screenshotsPerMessage}`, `${advance.limits.screenshotsPerMessage}`],
  },
  { label: "Live XAU/USD price and session", values: [true, true, true, true] },
  { label: "Risk calculator", values: [true, true, true, true] },
  { label: "Multi-timeframe confluence", values: [false, false, true, true] },
  { label: "Daily (D1) macro summaries", values: [false, false, true, true] },
  { label: "Deep macro reports (1 year)", values: [false, false, false, true] },
  { label: "Priority response speed", values: [false, false, true, true] },
  { label: "Priority support", values: [false, false, false, true] },
  {
    label: "Chat history",
    values: ["Kept", `${plus.limits.historyDays} days`, `${pro.limits.historyDays} days`, `${advance.limits.historyDays} days`],
  },
];

const FAQ = [
  {
    q: "Is the first chat really free?",
    a: `Yes. Every new account gets one free chat with up to ${FREE_FIRST_CHAT.messagesPerChat} messages and ${FREE_FIRST_CHAT.screenshotsTotal} chart screenshots. No card is needed.`,
  },
  {
    q: "What happens when I use up my monthly analyses?",
    a: "You can upgrade to a higher plan any time, or wait for your allowance to renew next month.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Move between Plus, Pro and Advance whenever your trading needs change.",
  },
] as const;

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm text-[var(--mk-text)]">{value}</span>;
  }

  return value ? (
    <Check size={17} className="mx-auto text-[var(--mk-green)]" aria-label="Included" />
  ) : (
    <Minus size={17} className="mx-auto text-white/25" aria-label="Not included" />
  );
}

export default function PricingPage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="mk-grid pointer-events-none absolute inset-0" />

        <div className="container-shell relative py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#22c58b]/25 bg-[#22c58b]/10 px-4 py-2 text-xs font-semibold text-[var(--mk-green)]">
            <Gift size={14} aria-hidden="true" />
            Your first chat is free
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Simple pricing for <span className="mk-gold-text">serious gold traders</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--mk-muted)] sm:text-lg">
            Try a full chat with chart analysis for free. Pick a plan when you
            want to keep going. Prices in USD per month.
          </p>
        </div>
      </section>

      <section className="container-shell pb-20">
        <PlanCards />
      </section>

      <section className="container-shell pb-20 sm:pb-28">
        <h2 className="text-center text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
          Compare plans
        </h2>

        <div className="mk-card mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-white/[0.08] text-sm">
                <th className="px-6 py-4 font-medium text-[var(--mk-muted)]">Feature</th>
                <th className="px-4 py-4 text-center font-semibold">Free chat</th>
                <th className="px-4 py-4 text-center font-semibold">Plus · ${plus.priceUsd}</th>
                <th className="px-4 py-4 text-center font-semibold text-[var(--mk-gold)]">Pro · ${pro.priceUsd}</th>
                <th className="px-4 py-4 text-center font-semibold">Advance · ${advance.priceUsd}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-white/[0.05] last:border-0">
                  <th scope="row" className="px-6 py-3.5 text-sm font-medium text-[var(--mk-text)]">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={index} className="px-4 py-3.5 text-center">
                      <Cell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container-shell pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map((item) => (
            <div key={item.q} className="mk-card px-6 py-5">
              <h3 className="text-base font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--mk-muted)]">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <LinkButton href="/signup" size="lg">
            Start your first chat free
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
