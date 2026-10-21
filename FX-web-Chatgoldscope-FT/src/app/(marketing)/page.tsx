import {
  ArrowRight,
  Calculator,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Globe,
  History,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { HeroChart } from "@/components/marketing/HeroChart";
import { LinkButton } from "@/components/marketing/LinkButton";
import { PlanCards } from "@/components/marketing/PlanCards";
import { FREE_FIRST_CHAT } from "@/config/plans";

const STATS = [
  { value: "XAU/USD", label: "Built for gold only" },
  { value: "3", label: "Sessions tracked: Asia · London · New York" },
  { value: "3 charts", label: "Compare timeframes in one message" },
  { value: "Risk first", label: "Invalidation in every analysis" },
] as const;

const STEPS = [
  {
    icon: Camera,
    title: "Show your setup",
    text: "Upload up to 3 chart screenshots from TradingView, MT4 or MT5, or simply ask a question about gold.",
  },
  {
    icon: Globe,
    title: "GoldScope adds the context",
    text: "Live XAU/USD price, bid, ask and spread, the active trading session and the market structure behind your chart.",
  },
  {
    icon: ShieldCheck,
    title: "You get scenarios, not hype",
    text: "Bullish and bearish scenarios, key levels, what would invalidate the idea and the risk to respect before you click.",
  },
] as const;

const BENEFITS = [
  {
    icon: Layers,
    title: "One clear read, not six tabs",
    text: "Stop switching between charts, news and notes. Get a structured view of the trade in one place.",
  },
  {
    icon: Camera,
    title: "Multi-timeframe in one go",
    text: "Send M15, H1 and H4 together and see where they agree and where they conflict.",
  },
  {
    icon: Clock3,
    title: "Session-aware",
    text: "Gold behaves differently in Asia, London and New York. Every answer knows which session is live.",
  },
  {
    icon: Calculator,
    title: "Risk before reward",
    text: "Built-in risk calculator and stop-loss review so position size is decided before the entry is.",
  },
  {
    icon: TrendingUp,
    title: "Big picture on demand",
    text: "Ask for a macro view and get a trend, support/resistance and momentum summary from daily data.",
  },
  {
    icon: History,
    title: "Your analyses, saved",
    text: "Come back to previous chats and compare what you saw then with what price did.",
  },
] as const;

const FAQ = [
  {
    q: "Does GoldScope tell me when to buy or sell?",
    a: "No. It gives scenarios, key levels and risk context so you can decide for yourself. It never guarantees outcomes and it does not place trades.",
  },
  {
    q: "What do I need to start?",
    a: "Create an account and open a chat. Your first chat is free, with no card required.",
  },
  {
    q: "Which charts can I upload?",
    a: "Screenshots from TradingView, MT4, MT5 or any charting platform. PNG, JPG and WebP images are supported.",
  },
  {
    q: "What counts as one analysis?",
    a: "Each AI response to a message in your chat uses one analysis from your monthly allowance.",
  },
  {
    q: "What happens after my free chat?",
    a: "You pick a plan from $8 a month to keep going. Your free chat stays in your history.",
  },
  {
    q: "Is it only for gold?",
    a: "Yes. Focusing on XAU/USD is what lets the analysis go deep on sessions, structure and gold-specific risk.",
  },
] as const;

function SampleAnalysisCard() {
  return (
    <div className="mk-card overflow-hidden shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-b from-[#ffd76a] to-[#e0a62a] text-xs font-black text-[#1a1306]">
            Au
          </span>
          <div>
            <p className="text-sm font-semibold">XAU/USD · M15</p>
            <p className="text-xs text-[var(--mk-muted)]">Sample analysis</p>
          </div>
        </div>

        <span className="flex items-center gap-2 rounded-full border border-[#22c58b]/25 bg-[#22c58b]/10 px-3 py-1 text-xs font-medium text-[var(--mk-green)]">
          <span className="mk-live-dot size-1.5 rounded-full bg-[var(--mk-green)]" />
          London session
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-2">
          <HeroChart />
        </div>

        <div className="mt-4 flex items-start justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#4f8cff]/15 px-4 py-2.5 text-sm text-[var(--mk-text)]">
            Gold pulled back from the highs. Is a buy still valid here?
          </div>
        </div>

        <div className="mt-3 rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.03] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--mk-gold)]">
            <Sparkles size={13} aria-hidden="true" />
            GoldScope read
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--mk-text)]/90">
            Uptrend intact on M15, price is testing the first support. A buy
            needs a hold and a bullish close first. Until then it is a wait.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#22c58b]/25 bg-[#22c58b]/[0.07] p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-[var(--mk-green)]">
                <TrendingUp size={14} aria-hidden="true" /> Bullish scenario
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--mk-muted)]">
                Holds support, closes above the last lower high.
              </p>
            </div>

            <div className="rounded-xl border border-[#f0616d]/25 bg-[#f0616d]/[0.07] p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-[var(--mk-red)]">
                <TrendingDown size={14} aria-hidden="true" /> Bearish scenario
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--mk-muted)]">
                Candle closes below support, momentum turns down.
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-lg border border-[#f5c451]/25 bg-[#f5c451]/[0.07] px-3 py-2 text-xs leading-5 text-[#f5d98a]">
            Risk: stop-loss not confirmed. Define it before sizing the trade.
          </p>
        </div>
      </div>

      <p className="border-t border-white/[0.07] px-5 py-3 text-[11px] text-[var(--mk-muted)]">
        Illustrative example with sample data. Not a live signal.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="mk-grid pointer-events-none absolute inset-0" />

        <div className="container-shell relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1fr_1.02fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f5c451]/25 bg-[#f5c451]/10 px-4 py-2 text-xs font-semibold text-[var(--mk-gold)]">
              <Sparkles size={14} aria-hidden="true" />
              The AI copilot built only for XAU/USD
            </span>

            <h1 className="mt-7 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Stop guessing on gold.{" "}
              <span className="mk-gold-text">See the trade before you take it.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--mk-muted)] sm:text-lg sm:leading-8">
              Drop in your chart or ask a question. GoldScope reads the price
              action, adds live market and session context, and gives you
              scenarios, key levels and risk in seconds.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/signup" size="lg">
                Start your first chat free
                <ArrowRight size={18} aria-hidden="true" />
              </LinkButton>

              <LinkButton href="#how-it-works" variant="outline" size="lg">
                See how it works
              </LinkButton>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--mk-muted)]">
              {["No card required", "1 free chat", "Plans from $8/month"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check size={15} className="text-[var(--mk-green)]" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-full bg-[#f5c451]/10 blur-3xl"
            />
            <div className="mk-float relative">
              <SampleAnalysisCard />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/[0.07] bg-white/[0.02]">
        <div className="container-shell grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.value}>
              <p className="mk-mono text-2xl font-semibold text-[var(--mk-gold)] sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--mk-muted)] sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="container-shell scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-[var(--mk-gold)]">HOW IT HELPS</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            From chart to clear decision in three steps
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--mk-muted)]">
            Gold moves fast and one missed detail is expensive. GoldScope does
            the reading and structuring so you spend your attention on the decision.
          </p>
        </div>

        <div className="relative mt-14 grid gap-5 lg:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="mk-card relative p-7">
              <span className="mk-mono absolute right-6 top-5 text-5xl font-semibold text-white/[0.05]">
                0{index + 1}
              </span>
              <div className="flex size-12 items-center justify-center rounded-xl border border-[#f5c451]/25 bg-[#f5c451]/10 text-[var(--mk-gold)]">
                <Icon size={22} aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--mk-muted)]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section id="features" className="scroll-mt-20 border-y border-white/[0.07] bg-white/[0.02] py-20 sm:py-28">
        <div className="container-shell">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-widest text-[var(--mk-gold)]">WHY TRADERS USE IT</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Everything a gold trader checks, in one conversation
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="mk-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#f5c451]/30"
              >
                <Icon size={22} className="text-[var(--mk-gold)]" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--mk-muted)]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="container-shell py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            More useful than a generic chatbot
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="mk-card p-7">
            <p className="text-sm font-semibold text-[var(--mk-muted)]">Generic AI chatbot</p>
            <ul className="mt-5 space-y-3.5 text-sm text-[var(--mk-muted)]">
              {[
                "Does not know the live gold price",
                "Guesses from a screenshot with no market context",
                "Long answers with no clear levels",
                "Rarely mentions risk or invalidation",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X size={16} className="mt-0.5 shrink-0 text-[var(--mk-red)]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mk-card border-[#f5c451]/40 bg-gradient-to-b from-[#f5c451]/[0.08] to-transparent p-7">
            <p className="text-sm font-semibold text-[var(--mk-gold)]">GoldScope AI</p>
            <ul className="mt-5 space-y-3.5 text-sm text-[var(--mk-text)]">
              {[
                "Live XAU/USD price, bid, ask and spread",
                "Reads your chart with session and structure context",
                "Scenarios with clear levels",
                "Invalidation and risk in every analysis",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={16} className="mt-0.5 shrink-0 text-[var(--mk-green)]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-20 border-y border-white/[0.07] bg-white/[0.02] py-20 sm:py-28">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[var(--mk-gold)]">PRICING</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Start free. Upgrade when it pays for itself.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--mk-muted)]">
              Your first chat is on us: {FREE_FIRST_CHAT.messagesPerChat} messages and{" "}
              {FREE_FIRST_CHAT.screenshotsTotal} chart screenshots, no card needed.
            </p>
          </div>

          <div className="mt-14">
            <PlanCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-shell py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Questions traders ask
          </h2>

          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="mk-card group px-6 py-4">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold sm:text-base">
                  {item.q}
                  <ChevronDown
                    size={18}
                    className="mk-chevron shrink-0 text-[var(--mk-muted)] transition-transform"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-6 text-[var(--mk-muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container-shell pb-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-[28px] border border-[#f5c451]/30 bg-gradient-to-br from-[#f5c451]/[0.14] via-[#0e1627] to-[#0e1627] px-6 py-14 text-center sm:px-14 sm:py-20">
          <div aria-hidden="true" className="mk-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Your next gold trade deserves a second look.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--mk-muted)]">
              Open your first chat free. Upload a chart and see the full picture in seconds.
            </p>
            <div className="mt-9 flex justify-center">
              <LinkButton href="/signup" size="lg">
                Start your first chat free
                <ArrowRight size={18} aria-hidden="true" />
              </LinkButton>
            </div>
            <p className="mx-auto mt-6 max-w-lg text-xs leading-5 text-[var(--mk-muted)]">
              Decision-support software only. No guaranteed returns, automatic
              order execution or certainty-based buy and sell calls.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
