/**
 * Shared Twelve Data credit budget.
 *
 * Twelve Data limits credits PER MINUTE (8 on the free plan, more
 * on paid plans). Every outgoing request - price, quote and candles -
 * must pass through this gate so the whole server stays under the
 * limit instead of firing requests that are rejected and still
 * counted ("You have run out of API credits for the current minute").
 *
 * Set TWELVE_DATA_CREDITS_PER_MINUTE to your plan's limit minus a
 * small safety margin. After upgrading the plan, just raise it.
 */
import { env } from "../../config.js";

const WINDOW_MS = 60_000;
const DEFAULT_MAX_WAIT_MS = 6_000;
const RATE_LIMIT_COOLDOWN_MS = 15_000;

export class TwelveDataBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwelveDataBudgetError";
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

class TwelveDataBudget {
  private stamps: number[] = [];
  private cooldownUntil = 0;
  private dailyLimitUntil = 0;

  constructor(private readonly limitPerMinute: number) {}

  /**
   * Waits for a free slot. Rejects if one will not be available
   * within maxWaitMs, so callers fall back to cached data quickly.
   */
  async acquire(
    label: string,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
  ): Promise<void> {
    const startedAt = Date.now();

    for (;;) {
      const now = Date.now();

      if (now < this.dailyLimitUntil) {
        throw new TwelveDataBudgetError(
          `Twelve Data daily credit limit reached. No requests are sent until ${new Date(this.dailyLimitUntil).toISOString()} (daily reset, 00:00 UTC). Skipped "${label}".`,
        );
      }

      this.stamps = this.stamps.filter(
        (stamp) => now - stamp < WINDOW_MS,
      );

      let waitMs = Math.max(0, this.cooldownUntil - now);

      const oldest = this.stamps[0];

      if (
        this.stamps.length >= this.limitPerMinute &&
        oldest !== undefined
      ) {
        waitMs = Math.max(
          waitMs,
          oldest + WINDOW_MS - now + 25,
        );
      }

      if (waitMs <= 0) {
        this.stamps.push(now);
        return;
      }

      if (now - startedAt + waitMs > maxWaitMs) {
        throw new TwelveDataBudgetError(
          `Twelve Data credit budget exhausted (${this.limitPerMinute}/min). Skipped "${label}"; cached data will be used.`,
        );
      }

      await sleep(Math.min(waitMs, 500));
    }
  }

  /**
   * Call when Twelve Data itself reports a limit was hit.
   *
   * A DAILY limit does not clear in seconds. Retrying every 15s
   * only hammers the API and floods the log, so every request is
   * skipped until the daily reset (00:00 UTC). Restarting the
   * server (for example after upgrading the plan) clears this.
   */
  reportRateLimited(message?: string): void {
    if (message && isDailyLimitMessage(message)) {
      const now = new Date();

      this.dailyLimitUntil = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        1,
      );

      return;
    }

    this.cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  }

  /** True while requests are paused because the daily limit was hit. */
  isDailyLimitReached(): boolean {
    return Date.now() < this.dailyLimitUntil;
  }

  usedInLastMinute(): number {
    const now = Date.now();

    return this.stamps.filter(
      (stamp) => now - stamp < WINDOW_MS,
    ).length;
  }

  get limit(): number {
    return this.limitPerMinute;
  }
}

export const twelveDataBudget = new TwelveDataBudget(
  env.TWELVE_DATA_CREDITS_PER_MINUTE,
);

export function isRateLimitMessage(
  message: string | undefined,
): boolean {
  return Boolean(
    message &&
      /run out of api credits|rate limit|too many requests/i.test(
        message,
      ),
  );
}

export function isDailyLimitMessage(
  message: string | undefined,
): boolean {
  return Boolean(
    message &&
      /credits for the day|daily (api )?(credit|limit)|per day/i.test(
        message,
      ),
  );
}
