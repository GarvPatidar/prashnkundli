export type MarketSession =
  | "ASIA"
  | "LONDON"
  | "NEW_YORK"
  | "LONDON_NEW_YORK_OVERLAP"
  | "OFF_HOURS";

export type SessionLiquidity =
  | "LOW"
  | "NORMAL"
  | "HIGH";

export interface MarketSessionContext {
  session: MarketSession;
  liquidity: SessionLiquidity;

  utcHour: number;
  utcMinute: number;

  isAsiaSession: boolean;
  isLondonSession: boolean;
  isNewYorkSession: boolean;
  isOverlap: boolean;

  minutesUntilNextSessionChange: number | null;

  warnings: string[];
  generatedAt: string;
}