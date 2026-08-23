import type {
  Candle,
  TimeframeIndicatorSnapshot,
} from "./indicator.types.js";

import { calculateAdx } from "./adx.js";
import { calculateAtr } from "./atr.js";
import { calculateBollingerBands } from "./bollinger-bands.js";
import { validateCandles } from "./candle.utils.js";
import { calculateEma } from "./ema.js";
import { calculateMacd } from "./macd.js";
import { calculateMarketStructure } from "./market-structure.js";
import { calculateObv } from "./obv.js";
import { calculateRsi } from "./rsi.js";
import { calculateSma } from "./sma.js";
import { calculateStochastic } from "./stochastic.js";
import { calculateVwap } from "./vwap.js";

const EMA_FAST_PERIOD = 20;
const EMA_MEDIUM_PERIOD = 50;
const EMA_LONG_PERIOD = 200;

const SMA_FAST_PERIOD = 21;
const SMA_SLOW_PERIOD = 44;

const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const ADX_PERIOD = 14;

const BOLLINGER_PERIOD = 20;
const BOLLINGER_STANDARD_DEVIATIONS = 2;

const MACD_FAST_PERIOD = 12;
const MACD_SLOW_PERIOD = 26;
const MACD_SIGNAL_PERIOD = 9;

const STOCHASTIC_K_PERIOD = 14;
const STOCHASTIC_D_PERIOD = 3;
const STOCHASTIC_SMOOTH_K_PERIOD = 3;

const MINIMUM_RECOMMENDED_CANDLES = 250;

export type SupportedTimeframe =
  | "M15"
  | "M30"
  | "H1"
  | "H4"
  | "D1";

export interface CalculateIndicatorSnapshotInput {
  timeframe: SupportedTimeframe;

  /**
   * Candles must be ordered oldest → newest.
   * At least 250 candles are recommended so EMA 200
   * has sufficient warm-up history.
   */
  candles: readonly Candle[];

  /**
   * Optional session-specific candles for VWAP.
   * For example, current trading-day/session candles.
   *
   * When omitted, VWAP uses the supplied timeframe candles.
   */
  sessionCandles?: readonly Candle[] | undefined;
}

export interface IndicatorSnapshotMetadata {
  timeframe: SupportedTimeframe;
  candleCount: number;
  minimumRecommendedCandles: number;
  hasRecommendedHistory: boolean;
  oldestCandleAt: string;
  latestCandleAt: string;
  latestClose: number;
  generatedAt: string;
}

export interface CompleteIndicatorSnapshot
  extends TimeframeIndicatorSnapshot {
  metadata: IndicatorSnapshotMetadata;
}

export type IndicatorServiceErrorCode =
  | "INVALID_TIMEFRAME"
  | "INSUFFICIENT_CANDLES"
  | "INDICATOR_CALCULATION_FAILED";

export class IndicatorServiceError extends Error {
  constructor(
    message: string,
    public readonly code: IndicatorServiceErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "IndicatorServiceError";
  }
}

function validateTimeframe(
  timeframe: string,
): asserts timeframe is SupportedTimeframe {
  const supportedTimeframes: readonly SupportedTimeframe[] = [
    "M15",
    "M30",
    "H1",
    "H4",
    "D1",
  ];

  if (
    !supportedTimeframes.includes(
      timeframe as SupportedTimeframe,
    )
  ) {
    throw new IndicatorServiceError(
      `Unsupported timeframe: ${timeframe}.`,
      "INVALID_TIMEFRAME",
    );
  }
}

function validateInput(
  input: CalculateIndicatorSnapshotInput,
): void {
  validateTimeframe(input.timeframe);
  validateCandles(input.candles);

  if (input.sessionCandles) {
    validateCandles(input.sessionCandles);
  }

  if (input.candles.length < 2) {
    throw new IndicatorServiceError(
      "At least two candles are required for indicator analysis.",
      "INSUFFICIENT_CANDLES",
    );
  }
}

function getSnapshotMetadata(
  timeframe: SupportedTimeframe,
  candles: readonly Candle[],
  generatedAt: string,
): IndicatorSnapshotMetadata {
  const oldestCandle = candles[0];
  const latestCandle =
    candles[candles.length - 1];

  if (!oldestCandle || !latestCandle) {
    throw new IndicatorServiceError(
      "Indicator metadata could not be prepared because candle data is missing.",
      "INSUFFICIENT_CANDLES",
    );
  }

  return {
    timeframe,
    candleCount: candles.length,
    minimumRecommendedCandles:
      MINIMUM_RECOMMENDED_CANDLES,
    hasRecommendedHistory:
      candles.length >=
      MINIMUM_RECOMMENDED_CANDLES,
    oldestCandleAt: oldestCandle.timestamp,
    latestCandleAt: latestCandle.timestamp,
    latestClose: latestCandle.close,
    generatedAt,
  };
}

export class IndicatorService {
  calculateTimeframeSnapshot(
    input: CalculateIndicatorSnapshotInput,
  ): CompleteIndicatorSnapshot {
    try {
      validateInput(input);

      const generatedAt =
        new Date().toISOString();

      const vwapCandles =
        input.sessionCandles ??
        input.candles;

      /*
       * Each calculation is deterministic and receives
       * the same validated candle history.
       *
       * Indicators with insufficient lookback return null
       * instead of fabricating a value.
       */
      const ema20 = calculateEma(
        input.candles,
        EMA_FAST_PERIOD,
      );

      const ema50 = calculateEma(
        input.candles,
        EMA_MEDIUM_PERIOD,
      );

      const ema200 = calculateEma(
        input.candles,
        EMA_LONG_PERIOD,
      );

      const sma21 = calculateSma(
        input.candles,
        SMA_FAST_PERIOD,
      );

      const sma44 = calculateSma(
        input.candles,
        SMA_SLOW_PERIOD,
      );

      const rsi14 = calculateRsi(
        input.candles,
        RSI_PERIOD,
      );

      const macd = calculateMacd(
        input.candles,
        MACD_FAST_PERIOD,
        MACD_SLOW_PERIOD,
        MACD_SIGNAL_PERIOD,
      );

      const atr14 = calculateAtr(
        input.candles,
        ATR_PERIOD,
      );

      const bollingerBands =
        calculateBollingerBands(
          input.candles,
          BOLLINGER_PERIOD,
          BOLLINGER_STANDARD_DEVIATIONS,
        );

      const adx14 = calculateAdx(
        input.candles,
        ADX_PERIOD,
      );

      const vwap =
        calculateVwap(vwapCandles);

      const stochastic =
        calculateStochastic(
          input.candles,
          STOCHASTIC_K_PERIOD,
          STOCHASTIC_D_PERIOD,
          STOCHASTIC_SMOOTH_K_PERIOD,
        );

      const obv =
        calculateObv(input.candles);

      const structure =
        calculateMarketStructure(
          input.candles,
          {
            leftBars: 3,
            rightBars: 3,
            atrPeriod: ATR_PERIOD,
            maxLevels: 5,
            equalityTolerancePercent: 0.05,
            levelTolerancePercent: 0.15,
          },
        );

      return {
        timeframe: input.timeframe,
        candleCount: input.candles.length,

        ema20,
        ema50,
        ema200,

        sma21,
        sma44,

        rsi14,
        macd,
        atr14,
        bollingerBands,
        adx14,
        vwap,
        stochastic,
        obv,
        structure,

        generatedAt,

        metadata: getSnapshotMetadata(
          input.timeframe,
          input.candles,
          generatedAt,
        ),
      };
    } catch (error) {
      if (
        error instanceof
        IndicatorServiceError
      ) {
        throw error;
      }

      throw new IndicatorServiceError(
        `Indicator calculation failed for ${input.timeframe}.`,
        "INDICATOR_CALCULATION_FAILED",
        error,
      );
    }
  }
}

export const indicatorService =
  new IndicatorService();