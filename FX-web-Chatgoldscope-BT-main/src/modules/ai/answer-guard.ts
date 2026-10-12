/**
 * Grounding guard. Every price-like number in text written by the AI must exist
 * in the verified context that was given to it (within rounding). A sentence
 * that quotes a price the engine never produced is removed, so the user never
 * sees an invented level.
 */

/** Gold prices are 4-digit numbers; smaller numbers (RSI, ATR, %) are not checked. */
const MIN_PRICE = 1000;
const MAX_PRICE = 99_999;
const TOLERANCE = 1.5;

const NUMBER_PATTERN = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

function isPriceLike(raw: string, value: number): boolean {
  if (value < MIN_PRICE || value > MAX_PRICE) return false;
  // Plain integers that look like a year (e.g. 2026) are not prices.
  if (/^(19|20)\d{2}$/.test(raw)) return false;
  return true;
}

export function extractPrices(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const raw = match[0];
    const value = Number(raw.replaceAll(",", ""));
    if (Number.isFinite(value) && isPriceLike(raw, value)) out.push(value);
  }
  return out;
}

/** Collects every price-like number from an arbitrary JSON-like value (numbers and text). */
export function collectAllowedPrices(context: unknown): number[] {
  const out: number[] = [];
  const seen = new WeakSet<object>();

  const walk = (value: unknown): void => {
    if (typeof value === "number") {
      if (Number.isFinite(value) && value >= MIN_PRICE && value <= MAX_PRICE) out.push(value);
    } else if (typeof value === "string") {
      out.push(...extractPrices(value));
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      Object.values(value as Record<string, unknown>).forEach(walk);
    }
  };

  walk(context);
  return out;
}

export const isGrounded = (price: number, allowed: readonly number[]): boolean =>
  allowed.some((a) => Math.abs(a - price) <= TOLERANCE);

export interface GuardResult {
  text: string;
  removedSentences: string[];
}

/** Removes sentences that contain a price not present in the allowed set. */
export function stripUngroundedSentences(
  text: string,
  allowed: readonly number[],
): GuardResult {
  // Split after . ! ? or newline, but not inside a number such as 4,512.30
  const parts = text.split(/(?<=[!?])\s+|(?<=\.)\s+(?=[A-Z"'(])|\n+/);
  const kept: string[] = [];
  const removed: string[] = [];

  for (const part of parts) {
    const bad = extractPrices(part).some((p) => !isGrounded(p, allowed));
    (bad ? removed : kept).push(part);
  }

  return { text: kept.join(" ").trim(), removedSentences: removed };
}

export const SAFE_REPLACEMENT =
  "Please refer to the verified levels shown in the market data for exact prices.";

/**
 * Applies the guard to every string field of an object and returns a sanitised
 * copy plus everything that was removed (for logging).
 */
export function guardStrings<T extends Record<string, unknown>>(
  fields: T,
  context: unknown,
  extraAllowed: readonly number[] = [],
): { value: T; removed: string[] } {
  const allowed = [...collectAllowedPrices(context), ...extraAllowed];
  const removed: string[] = [];
  const next: Record<string, unknown> = { ...fields };

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string") continue;
    const result = stripUngroundedSentences(value, allowed);
    if (result.removedSentences.length === 0) continue;
    removed.push(...result.removedSentences);
    next[key] = result.text.length > 0 ? result.text : SAFE_REPLACEMENT;
  }

  return { value: next as T, removed };
}
