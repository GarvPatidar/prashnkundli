export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface EmaResult {
  period: number;
  value: number | null;
}

export interface RsiResult {
  period: number;
  value: number | null;
  condition:
    | "OVERSOLD"
    | "NEUTRAL"
    | "OVERBOUGHT"
    | "UNAVAILABLE";
}

export interface MacdResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface AtrResult {
  period: number;
  value: number | null;
}

export interface BollingerBandsResult {
  period: number;
  standardDeviations: number;
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export interface PriceLevel {
  price: number;
  strength: number;
  touches: number;
}

export interface MarketStructureResult {
  trend:
    | "BULLISH"
    | "BEARISH"
    | "RANGING"
    | "INSUFFICIENT_DATA";

  volatility:
    | "LOW"
    | "NORMAL"
    | "HIGH"
    | "INSUFFICIENT_DATA";

  supports: PriceLevel[];
  resistances: PriceLevel[];
}

export interface TimeframeIndicatorSnapshot {
  timeframe: string;
  candleCount: number;

  ema20: EmaResult;
  ema50: EmaResult;
  ema200: EmaResult;

  sma21: SmaResult;
  sma44: SmaResult;

  rsi14: RsiResult;
  macd: MacdResult;
  atr14: AtrResult;
  bollingerBands: BollingerBandsResult;
  adx14: AdxResult;
  vwap: VwapResult;
  stochastic: StochasticResult;
  obv: ObvResult;

  structure: MarketStructureResult;
  generatedAt: string;
}
export interface AdxResult {
  period: number;
  adx: number | null;
  plusDi: number | null;
  minusDi: number | null;
  strength:
    | "WEAK"
    | "DEVELOPING"
    | "STRONG"
    | "VERY_STRONG"
    | "UNAVAILABLE";
}
export interface VwapResult {
  value: number | null;
  source:
    | "VOLUME_WEIGHTED"
    | "UNAVAILABLE";
}
export interface StochasticResult {
  kPeriod: number;
  dPeriod: number;
  smoothKPeriod: number;

  percentK: number | null;
  percentD: number | null;

  condition:
    | "OVERSOLD"
    | "NEUTRAL"
    | "OVERBOUGHT"
    | "UNAVAILABLE";
}
export interface ObvResult {
  value: number | null;
  source:
    | "VOLUME_BASED"
    | "UNAVAILABLE";
}
export type SwingType =
  | "SWING_HIGH"
  | "SWING_LOW";

export interface SwingPoint {
  type: SwingType;
  index: number;
  timestamp: string;
  price: number;
  strength: number;
}
export interface SmaResult {
  period: number;
  value: number | null;
}