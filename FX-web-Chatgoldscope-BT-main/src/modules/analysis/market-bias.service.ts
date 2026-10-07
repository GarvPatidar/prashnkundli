import type {
  FinalMarketBias,
  MarketDirection,
} from "./confluence.service.js";
import {
  marketIntelligenceOrchestrator,
} from "./market-intelligence-orchestrator.service.js";

export interface TimeframeBias {
  timeframe: "M15" | "H1" | "H4" | "D1";
  direction: MarketDirection;
}

/**
 * Public, UI-safe market bias.
 *
 * `available: false` means the engine has no usable
 * analysis. The UI must then show "Bias unavailable"
 * and never fall back to a default direction.
 */
export type MarketBiasPayload =
  | {
      available: false;
      reason: string;
    }
  | {
      available: true;
      /** Collapsed direction for badges. */
      direction: MarketDirection;
      /** Exact engine label, e.g. CAUTIOUS_BEARISH. */
      label: FinalMarketBias;
      confidence: number;
      bullishScore: number;
      bearishScore: number;
      timeframes: TimeframeBias[];
      /** Evidence that supports the bias. */
      reasons: string[];
      conflicts: string[];
      /** True when provider refresh failed and old data is shown. */
      stale: boolean;
      updatedAt: string;
    };

const MAX_REASONS = 4;
const MAX_CONFLICTS = 3;

function collapseDirection(
  label: FinalMarketBias,
): MarketDirection {
  switch (label) {
    case "STRONG_BULLISH":
    case "BULLISH":
    case "CAUTIOUS_BULLISH":
      return "BULLISH";

    case "STRONG_BEARISH":
    case "BEARISH":
    case "CAUTIOUS_BEARISH":
      return "BEARISH";

    default:
      return "NEUTRAL";
  }
}

export async function getMarketBias(): Promise<MarketBiasPayload> {
  try {
    const latest =
      await marketIntelligenceOrchestrator.getLatest();

    const { result } = latest;
    const { summary, confluence } = result;

    const timeframes: TimeframeBias[] = (
      ["M15", "H1", "H4", "D1"] as const
    ).map((timeframe) => ({
      timeframe,
      direction:
        confluence.timeframes[timeframe]
          .direction,
    }));

    return {
      available: true,
      direction: collapseDirection(
        summary.bias,
      ),
      label: summary.bias,
      confidence: summary.confidence,
      bullishScore: summary.bullishScore,
      bearishScore: summary.bearishScore,
      timeframes,
      reasons:
        summary.strongestSignals.slice(
          0,
          MAX_REASONS,
        ),
      conflicts:
        summary.conflicts.slice(
          0,
          MAX_CONFLICTS,
        ),
      stale: latest.stale,
      updatedAt: new Date(
        latest.fetchedAt,
      ).toISOString(),
    };
  } catch {
    return {
      available: false,
      reason:
        "Live market analysis is temporarily unavailable.",
    };
  }
}
