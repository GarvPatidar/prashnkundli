import Link from "next/link";
import {
  ArrowRight,
  Camera,
  ChartNoAxesCombined,
  Check,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/atoms/Button";

const productFeatures = [
  {
    icon: Camera,
    title: "Upload your trading situation",
    description:
      "Share TradingView, MT4 or MT5 screenshots and confirm the detected position details before analysis.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Analyse current XAU/USD context",
    description:
      "Combine your trade situation with current market structure, important levels and multiple timeframes.",
  },
  {
    icon: ShieldCheck,
    title: "Understand risk before acting",
    description:
      "Receive structured scenarios, invalidation conditions and risk warnings instead of guaranteed trading calls.",
  },
] as const;

const trustPoints = [
  "Built exclusively for XAU/USD",
  "Screenshot and position analysis",
  "Scenario-based decision support",
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_12%_48%,rgba(184,138,46,0.06),transparent_24%)]"
        />

        <div
          aria-hidden="true"
          className="grid-bg pointer-events-none absolute inset-0 opacity-50"
        />

        <div className="container-shell relative grid min-h-[680px] items-center gap-14 py-20 lg:grid-cols-[1.04fr_0.96fr] lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--primary-strong)]">
              <Sparkles size={14} aria-hidden="true" />
              Built exclusively for XAU/USD traders
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--text)] sm:text-5xl lg:text-6xl">
              Understand your gold trade before making your next decision.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:text-lg sm:leading-8">
              Upload your chart, explain your current position and receive
              structured XAU/USD market analysis based on live context, risk and
              possible scenarios.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/app/chat">
                <Button>
                  Analyse my gold trade
                  <ArrowRight className="ml-2" size={17} aria-hidden="true" />
                </Button>
              </Link>

              <Link href="/how-it-works">
                <Button variant="secondary">See how it works</Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                    <Check size={13} aria-hidden="true" />
                  </span>

                  {point}
                </div>
              ))}
            </div>

            <p className="mt-6 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
              Decision-support software only. No guaranteed returns, automatic
              order execution or certainty-based buy and sell calls.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-full bg-[var(--primary)]/10 blur-3xl"
            />

            <div className="surface relative overflow-hidden p-3 sm:p-4">
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      XAU/USD
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Current trade analysis
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-[var(--success)]/15 bg-[var(--success-soft)] px-3 py-1.5 text-xs font-medium text-[var(--success)]">
                    <span className="size-1.5 rounded-full bg-[var(--success)]" />
                    Live context
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Camera size={19} aria-hidden="true" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          Screenshot detected
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                          XAU/USD · M15 · Buy position
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative my-4 h-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-blue)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_31px,rgba(37,99,235,0.05)_32px),repeating-linear-gradient(90deg,transparent,transparent_47px,rgba(37,99,235,0.05)_48px)]"
                    />

                    <div
                      aria-hidden="true"
                      className="absolute inset-x-6 bottom-8 top-10 bg-[linear-gradient(145deg,transparent_0%,transparent_8%,rgba(37,99,235,0.07)_9%,transparent_10%,transparent_20%,rgba(37,99,235,0.12)_21%,transparent_22%,transparent_32%,rgba(37,99,235,0.18)_33%,transparent_34%,transparent_47%,rgba(37,99,235,0.1)_48%,transparent_49%,transparent_62%,rgba(37,99,235,0.18)_63%,transparent_64%,transparent_78%,rgba(37,99,235,0.08)_79%,transparent_80%)]"
                    />

                    <div className="absolute left-4 top-4 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <Clock3 size={13} aria-hidden="true" />
                      Market data updated recently
                    </div>

                    <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/95 px-3 py-2 text-xs shadow-sm">
                      <span className="text-[var(--text-muted)]">
                        Market condition
                      </span>
                      <span className="font-medium text-[var(--text)]">
                        Awaiting confirmation
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">
                        Position assessment
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--text)]">
                        Setup requires confirmation
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--warning)]/15 bg-[var(--warning-soft)] p-4">
                      <p className="text-xs text-[var(--warning)]">
                        Primary risk
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--text)]">
                        Stop loss not confirmed
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] p-4">
                    <p className="text-xs font-semibold text-[var(--primary-strong)]">
                      Suggested next step
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Confirm your entry, stop loss and account risk before
                      requesting the complete analysis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-20 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-[var(--primary)]">
            CORE EXPERIENCE
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-4xl">
            More useful than a generic chatbot answer.
          </h2>

          <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">
            Every analysis starts with your real trading situation and clearly
            separates confirmed information, possible scenarios and missing
            details.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {productFeatures.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className="surface group relative overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7"
            >
              <div
                aria-hidden="true"
                className="absolute right-5 top-4 text-5xl font-semibold text-[var(--primary)]/[0.05]"
              >
                0{index + 1}
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] text-[var(--primary)]">
                <Icon size={20} aria-hidden="true" />
              </div>

              <h3 className="mt-6 text-lg font-semibold text-[var(--text)]">
                {title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}