/**
 * Single source of truth for pricing.
 * Backend must mirror these ids and limits (see `limits`).
 */

export type PlanId = "plus" | "pro" | "advance";

export interface PlanFeature {
  text: string;
  /** Feature is promised but not shipped yet. Rendered with a "Soon" tag. */
  soon?: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  tagline: string;
  highlighted?: boolean;
  badge?: string;
  limits: {
    analysesPerMonth: number;
    screenshotsPerMessage: number;
    historyDays: number;
  };
  features: PlanFeature[];
}

export const FREE_FIRST_CHAT = {
  chats: 1,
  messagesPerChat: 10,
  screenshotsTotal: 2,
} as const;

export const PLANS: readonly Plan[] = [
  {
    id: "plus",
    name: "Plus",
    priceUsd: 8,
    tagline: "For traders who want a sharper second opinion on gold.",
    limits: { analysesPerMonth: 40, screenshotsPerMessage: 1, historyDays: 30 },
    features: [
      { text: "40 AI analyses every month" },
      { text: "Chart screenshot analysis (1 image per message)" },
      { text: "Live XAU/USD price, bid, ask and spread" },
      { text: "Asia · London · New York session context" },
      { text: "Position size and risk calculator" },
      { text: "30-day chat history" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceUsd: 19,
    tagline: "For active traders who check several timeframes before every entry.",
    highlighted: true,
    badge: "Most popular",
    limits: { analysesPerMonth: 200, screenshotsPerMessage: 3, historyDays: 180 },
    features: [
      { text: "Everything in Plus" },
      { text: "200 AI analyses every month" },
      { text: "Up to 3 screenshots per message (M15 + H1 + H4)" },
      { text: "Multi-timeframe confluence and scenario maps" },
      { text: "Entry, stop-loss and target risk review" },
      { text: "Long-range daily (D1) macro summaries" },
      { text: "Priority response speed" },
      { text: "6-month chat history" },
      { text: "Export analysis as PDF", soon: true },
    ],
  },
  {
    id: "advance",
    name: "Advance",
    priceUsd: 39,
    tagline: "For full-time and high-volume gold traders.",
    limits: { analysesPerMonth: 600, screenshotsPerMessage: 3, historyDays: 365 },
    features: [
      { text: "Everything in Pro" },
      { text: "600 AI analyses every month" },
      { text: "Deep macro reports: trend, support/resistance, momentum" },
      { text: "1-year daily data analysis" },
      { text: "Fastest response queue" },
      { text: "Priority support" },
      { text: "1-year chat history" },
      { text: "Session-based price alerts", soon: true },
      { text: "Early access to new features" },
    ],
  },
] as const;
