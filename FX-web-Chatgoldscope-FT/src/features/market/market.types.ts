export interface MarketQuote {
  price: number;

  bid: number | null;

  ask: number | null;

  spread: number | null;

  provider: string;

  timestamp: string;
}

export interface MarketSession {
  name: string;

  highLiquidity: boolean;
}

/*
 * The snapshot endpoint currently returns
 * empty indicator/level objects.
 *
 * Do not invent a frontend contract before
 * the backend exposes a stable public shape.
 */
export type MarketIndicators =
  Record<string, unknown>;

export type MarketLevels =
  Record<string, unknown>;

export type BiasDirection =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL";

export interface BiasTimeframe {
  timeframe: "M15" | "H1" | "H4" | "D1";

  direction: BiasDirection;
}

/*
 * `available: false` means the analysis engine has no usable
 * data. The UI must show "Bias unavailable" and never fall
 * back to a default direction.
 */
export type MarketBias =
  | {
      available: false;

      reason: string;
    }
  | {
      available: true;

      direction: BiasDirection;

      /* Engine label, e.g. CAUTIOUS_BEARISH. */
      label: string;

      confidence: number;

      bullishScore: number;

      bearishScore: number;

      timeframes: BiasTimeframe[];

      reasons: string[];

      conflicts: string[];

      stale: boolean;

      updatedAt: string;
    };

export interface TradingSessionInfo {
  name: string;

  liquidity: "LOW" | "NORMAL" | "HIGH";

  isOverlap: boolean;

  minutesUntilNextChange: number | null;
}

export interface MarketSnapshot {
  symbol: string;

  quote: MarketQuote;

  session: MarketSession;

  indicators: MarketIndicators;

  levels: MarketLevels;

  generatedAt: string;

  /* Added by the backend; optional for older deployments. */
  bias?: MarketBias;

  tradingSession?: TradingSessionInfo;
}

export interface MarketSnapshotResponse {
  success: true;

  data: MarketSnapshot;
}