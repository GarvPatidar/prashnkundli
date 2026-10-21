import { Check } from "lucide-react";

import { PLANS } from "@/config/plans";
import { cn } from "@/lib/cn";

import { LinkButton } from "./LinkButton";

export function PlanCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
      {PLANS.map((plan) => (
        <article
          key={plan.id}
          className={cn(
            "mk-card relative flex flex-col p-7",
            plan.highlighted &&
              "border-[#f5c451]/50 bg-gradient-to-b from-[#f5c451]/[0.10] to-transparent shadow-[0_30px_80px_-30px_rgba(245,196,81,0.45)] lg:-my-3 lg:py-10",
          )}
        >
          {plan.badge ? (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#ffd76a] to-[#e0a62a] px-4 py-1 text-xs font-bold text-[#1a1306]">
              {plan.badge}
            </span>
          ) : null}

          <h3 className="text-lg font-semibold text-[var(--mk-text)]">
            {plan.name}
          </h3>

          <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--mk-muted)]">
            {plan.tagline}
          </p>

          <p className="mt-6 flex items-baseline gap-1">
            <span className="mk-mono text-5xl font-semibold tracking-tight text-[var(--mk-text)]">
              ${plan.priceUsd}
            </span>
            <span className="text-sm text-[var(--mk-muted)]">/ month</span>
          </p>

          <LinkButton
            href={`/signup?plan=${plan.id}`}
            variant={plan.highlighted ? "gold" : "outline"}
            className="mt-6 w-full"
          >
            Get {plan.name}
          </LinkButton>

          <p className="mt-3 text-center text-xs text-[var(--mk-muted)]">
            Your first chat is free. No card needed to try.
          </p>

          <ul className="mt-6 space-y-3 border-t border-white/[0.08] pt-6">
            {plan.features.map((feature) => (
              <li
                key={feature.text}
                className="flex items-start gap-3 text-sm leading-5 text-[var(--mk-text)]/90"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#22c58b]/15 text-[var(--mk-green)]">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                <span>
                  {feature.text}
                  {feature.soon ? (
                    <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--mk-muted)]">
                      Soon
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
