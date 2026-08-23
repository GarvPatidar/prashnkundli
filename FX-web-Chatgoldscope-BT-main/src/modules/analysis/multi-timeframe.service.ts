import {
  indicatorService,
  type CompleteIndicatorSnapshot,
} from "../indicators/indicator.service.js";

import type {
  Candle,
} from "../indicators/indicator.types.js";

export type AnalysisTimeframe =
  | "M15"
  | "H1"
  | "H4"
  | "D1";

export interface MultiTimeframeCandleInput {
  m15: readonly Candle[];
  h1: readonly Candle[];
  h4: readonly Candle[];
  d1: readonly Candle[];

  currentSessionM15?:
    | readonly Candle[]
    | undefined;
}

export interface MultiTimeframeSnapshots {
  M15: CompleteIndicatorSnapshot;
  H1: CompleteIndicatorSnapshot;
  H4: CompleteIndicatorSnapshot;
  D1: CompleteIndicatorSnapshot;
}

export interface MultiTimeframeAnalysisResult {
  symbol: "XAUUSD";
  primaryTimeframe: "M15";
  snapshots: MultiTimeframeSnapshots;
  generatedAt: string;
}

export type MultiTimeframeServiceErrorCode =
  | "M15_DATA_REQUIRED"
  | "H1_DATA_REQUIRED"
  | "H4_DATA_REQUIRED"
  | "D1_DATA_REQUIRED"
  | "MULTI_TIMEFRAME_ANALYSIS_FAILED";

export class MultiTimeframeServiceError extends Error {
  constructor(
    message: string,
    public readonly code: MultiTimeframeServiceErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MultiTimeframeServiceError";
  }
}

function assertTimeframeData(
  candles: readonly Candle[],
  timeframe: AnalysisTimeframe,
): void {
  if (candles.length === 0) {
    throw new MultiTimeframeServiceError(
      `${timeframe} candle data is required.`,
      `${timeframe}_DATA_REQUIRED` as MultiTimeframeServiceErrorCode,
    );
  }
}

function validateInput(
  input: MultiTimeframeCandleInput,
): void {
  assertTimeframeData(input.m15, "M15");
  assertTimeframeData(input.h1, "H1");
  assertTimeframeData(input.h4, "H4");
  assertTimeframeData(input.d1, "D1");
}

export class MultiTimeframeService {
  calculate(
    input: MultiTimeframeCandleInput,
  ): MultiTimeframeAnalysisResult {
    try {
      validateInput(input);

      const m15 =
        indicatorService.calculateTimeframeSnapshot({
          timeframe: "M15",
          candles: input.m15,
          ...(input.currentSessionM15
            ? {
                sessionCandles:
                  input.currentSessionM15,
              }
            : {}),
        });

      const h1 =
        indicatorService.calculateTimeframeSnapshot({
          timeframe: "H1",
          candles: input.h1,
        });

      const h4 =
        indicatorService.calculateTimeframeSnapshot({
          timeframe: "H4",
          candles: input.h4,
        });

      const d1 =
        indicatorService.calculateTimeframeSnapshot({
          timeframe: "D1",
          candles: input.d1,
        });

      return {
        symbol: "XAUUSD",
        primaryTimeframe: "M15",

        snapshots: {
          M15: m15,
          H1: h1,
          H4: h4,
          D1: d1,
        },

        generatedAt:
          new Date().toISOString(),
      };
    } catch (error) {
      if (
        error instanceof
        MultiTimeframeServiceError
      ) {
        throw error;
      }

      throw new MultiTimeframeServiceError(
        "Multi-timeframe analysis could not be completed.",
        "MULTI_TIMEFRAME_ANALYSIS_FAILED",
        error,
      );
    }
  }
}

export const multiTimeframeService =
  new MultiTimeframeService();