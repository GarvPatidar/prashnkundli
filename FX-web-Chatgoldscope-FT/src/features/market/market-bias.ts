import type {
  MarketBias,
  TradingSessionInfo,
} from "./market.types";

export interface BiasDisplay {
  label: string;

  /* Tailwind classes for the pill. */
  className: string;

  /* One-line explanation for tooltips and cards. */
  detail: string;
}

const PILL =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const LABELS: Record<string, string> = {
  STRONG_BULLISH: "Strong Bullish",
  BULLISH: "Bullish",
  CAUTIOUS_BULLISH: "Cautious Bullish",
  NEUTRAL: "Neutral",
  CAUTIOUS_BEARISH: "Cautious Bearish",
  BEARISH: "Bearish",
  STRONG_BEARISH: "Strong Bearish",
};

export function describeBias(
  bias: MarketBias | undefined,
): BiasDisplay {
  if (!bias || !bias.available) {
    return {
      label: "Bias unavailable",

      className: `${PILL} border-slate-200 bg-slate-50 text-slate-600`,

      detail:
        bias && !bias.available
          ? bias.reason
          : "Market bias is not available right now.",
    };
  }

  const name = LABELS[bias.label] ?? bias.label;

  const confidence = `${Math.round(bias.confidence)}% confidence`;

  const stale = bias.stale ? " (delayed)" : "";

  if (bias.direction === "BULLISH") {
    return {
      label: `\u25B2 ${name}${stale}`,

      className: `${PILL} border-emerald-200 bg-emerald-50 text-emerald-700`,

      detail: confidence,
    };
  }

  if (bias.direction === "BEARISH") {
    return {
      label: `\u25BC ${name}${stale}`,

      className: `${PILL} border-rose-200 bg-rose-50 text-rose-700`,

      detail: confidence,
    };
  }

  return {
    label: `\u25C6 ${name}${stale}`,

    className: `${PILL} border-amber-200 bg-amber-50 text-amber-700`,

    detail: confidence,
  };
}

const SESSION_LABELS: Record<string, string> = {
  ASIA: "ASIA",
  LONDON: "LONDON",
  NEW_YORK: "NEW YORK",
  LONDON_NEW_YORK_OVERLAP: "LONDON / NEW YORK",
  OFF_HOURS: "OFF HOURS",
};

export function formatTradingSession(
  session: TradingSessionInfo | undefined,
): string | null {
  if (!session) {
    return null;
  }

  return SESSION_LABELS[session.name] ?? session.name.replaceAll("_", " ");
}
