import { candleProvider } from "../market/candle.factory.js";

import {
  marketIntelligenceService,
  type MarketIntelligenceResult,
} from "./market-intelligence.service.js";

const DEFAULT_CANDLE_LIMIT =
  300;

export interface GenerateMarketIntelligenceInput {
  symbol?: "XAUUSD";

  candleLimit?: number;
}

export type MarketIntelligenceOrchestratorErrorCode =
  | "INVALID_CANDLE_LIMIT"
  | "MARKET_DATA_FETCH_FAILED"
  | "MARKET_INTELLIGENCE_GENERATION_FAILED";

export class MarketIntelligenceOrchestratorError
  extends Error {
  constructor(
    message: string,

    public readonly code:
      MarketIntelligenceOrchestratorErrorCode,

    public readonly cause?: unknown,
  ) {
    super(message);

    this.name =
      "MarketIntelligenceOrchestratorError";
  }
}

function validateCandleLimit(
  candleLimit: number,
): void {
  if (
    !Number.isInteger(
      candleLimit,
    ) ||
    candleLimit < 250 ||
    candleLimit > 1_000
  ) {
    throw new MarketIntelligenceOrchestratorError(
      "Candle limit must be an integer between 250 and 1000.",
      "INVALID_CANDLE_LIMIT",
    );
  }
}

function getCurrentSessionM15Candles<
  T extends {
    timestamp: string;
  },
>(
  candles: readonly T[],
): T[] {
  if (
    candles.length === 0
  ) {
    return [];
  }

  /*
   * For now use the latest UTC trading day.
   *
   * Later this can be replaced by the dedicated
   * Asia / London / New York session engine.
   */
  const latestCandle =
    candles[
      candles.length - 1
    ];

  if (
    !latestCandle
  ) {
    return [];
  }

  const latestDate =
    latestCandle.timestamp.slice(
      0,
      10,
    );

  return candles.filter(
    (
      candle,
    ) =>
      candle.timestamp.slice(
        0,
        10,
      ) === latestDate,
  );
}

export class MarketIntelligenceOrchestratorService {
  async generate(
    input:
      GenerateMarketIntelligenceInput = {},
  ): Promise<MarketIntelligenceResult> {
    const symbol =
      input.symbol ??
      "XAUUSD";

    const candleLimit =
      input.candleLimit ??
      DEFAULT_CANDLE_LIMIT;

    validateCandleLimit(
      candleLimit,
    );

    let m15Candles;
    let h1Candles;
    let h4Candles;
    let d1Candles;

    try {
      [
        m15Candles,
        h1Candles,
        h4Candles,
        d1Candles,
      ] = await Promise.all([
        candleProvider.getCandles({
          symbol,

          timeframe:
            "M15",

          limit:
            candleLimit,
        }),

        candleProvider.getCandles({
          symbol,

          timeframe:
            "H1",

          limit:
            candleLimit,
        }),

        candleProvider.getCandles({
          symbol,

          timeframe:
            "H4",

          limit:
            candleLimit,
        }),

        candleProvider.getCandles({
          symbol,

          timeframe:
            "D1",

          limit:
            candleLimit,
        }),
      ]);
    } catch (error) {
      throw new MarketIntelligenceOrchestratorError(
        "XAU/USD market data could not be fetched.",
        "MARKET_DATA_FETCH_FAILED",
        error,
      );
    }

    try {
      const currentSessionM15 =
        getCurrentSessionM15Candles(
          m15Candles,
        );

      return marketIntelligenceService.analyse({
        m15:
          m15Candles,

        h1:
          h1Candles,

        h4:
          h4Candles,

        d1:
          d1Candles,

        ...(currentSessionM15.length >
        0
          ? {
              currentSessionM15,
            }
          : {}),
      });
    } catch (error) {
      throw new MarketIntelligenceOrchestratorError(
        "XAU/USD market intelligence could not be generated.",
        "MARKET_INTELLIGENCE_GENERATION_FAILED",
        error,
      );
    }
  }
}

export const marketIntelligenceOrchestrator =
  new MarketIntelligenceOrchestratorService();