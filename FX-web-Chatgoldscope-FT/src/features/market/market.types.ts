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

export interface MarketSnapshot {
  symbol: string;

  quote: MarketQuote;

  session: MarketSession;

  indicators: MarketIndicators;

  levels: MarketLevels;

  generatedAt: string;
}

export interface MarketSnapshotResponse {
  success: true;

  data: MarketSnapshot;
}