import type { Candle } from "../indicators/indicator.types.js";

export type MarketTimeframe =
  | "M15"
  | "H1"
  | "H4"
  | "D1";

export interface GetCandlesInput {
  symbol: "XAUUSD";
  timeframe: MarketTimeframe;
  limit: number;
}

export interface CandleProvider {
  getCandles(
    input: GetCandlesInput,
  ): Promise<Candle[]>;
}