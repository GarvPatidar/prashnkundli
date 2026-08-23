import type {
  AnalysisResult,
} from "../../types.js";

import type {
  AiAnalysisInput,
  AiProvider,
} from "./ai.provider.js";

function createMarketUnavailableResponse(
  input: AiAnalysisInput,
): AnalysisResult {
  const hasAttachment =
    Boolean(
      input.context.user
        .attachment,
    );

  return {
    marketCondition:
      hasAttachment
        ? "Live XAU/USD market intelligence is temporarily unavailable. I can still review clearly visible information from the attached trade screenshot, but I cannot reliably compare the position against the current market direction."
        : "Live XAU/USD market intelligence is temporarily unavailable, so I cannot reliably determine the current market direction right now.",

    mainRisk:
      "Do not make a new market-direction decision from unavailable live market data.",

    bullishScenario:
      "A bullish scenario cannot be verified until live market intelligence becomes available again.",

    bearishScenario:
      "A bearish scenario cannot be verified until live market intelligence becomes available again.",

    positionStatus:
      hasAttachment
        ? "Review only the clearly visible position details from the attached screenshot. Do not guess unreadable values."
        : "No reliable live position-versus-market comparison can be made without current market intelligence.",

    nextStep:
      hasAttachment
        ? "Use the screenshot details that are clearly visible and wait for live market intelligence before making a current-direction comparison."
        : "Try again when live market intelligence is available.",

    confidence:
      null,

    disclaimer:
      "Market information may be temporarily unavailable. Do not rely on unavailable or assumed live data for trading decisions.",
  };
}

export class MockAiProvider
  implements AiProvider
{
  async analyse(
    input:
      AiAnalysisInput,
  ): Promise<AnalysisResult> {
    const {
      context,
    } = input;

    /*
     * Degraded mode:
     *
     * Never manufacture market direction,
     * confidence, support or resistance when
     * verified market intelligence is absent.
     */
    if (
      !context.market ||
      !context.risk
    ) {
      return createMarketUnavailableResponse(
        input,
      );
    }

    const {
      currentMarket,
      conflicts,
      strongestSignals,
    } =
      context.market;

    const primaryRisk =
      context.risk
        .warnings[0] ??
      conflicts[0] ??
      "No major verified risk warning is currently available.";

    const bullishSignal =
      strongestSignals.find(
        (
          signal:
            string,
        ) => {
          const normalized =
            signal.toLowerCase();

          return (
            normalized.includes(
              "bull",
            ) ||
            normalized.includes(
              "buy",
            ) ||
            normalized.includes(
              "up",
            )
          );
        },
      );

    const bearishSignal =
      strongestSignals.find(
        (
          signal:
            string,
        ) => {
          const normalized =
            signal.toLowerCase();

          return (
            normalized.includes(
              "bear",
            ) ||
            normalized.includes(
              "sell",
            ) ||
            normalized.includes(
              "down",
            )
          );
        },
      );

    const riskEnvironment =
      context.risk
        .tradeEnvironment;

    return {
      marketCondition:
        `XAU/USD currently has a ${currentMarket.direction.toLowerCase()} market direction with ${currentMarket.confidence}% confidence.`,

      mainRisk:
        primaryRisk,

      bullishScenario:
        bullishSignal ??
        "The bullish case would strengthen with clearer buyer control and stronger confirmation.",

      bearishScenario:
        bearishSignal ??
        "The bearish case would strengthen with clearer seller control and stronger confirmation.",

      positionStatus:
        context.user.position
          ? "The supplied position should be evaluated against the current verified market structure and risk environment."
          : "No complete structured position was supplied.",

      nextStep:
        riskEnvironment ===
        "AVOID"
          ? "Avoid fresh exposure until verified risk conditions improve."
          : "Wait for confirmation and keep risk defined before entering or modifying a trade.",

      confidence:
        currentMarket
          .confidence,

      disclaimer:
        "This is market decision-support only. Verify live execution conditions and your own risk limits before acting.",
    };
  }
}

export const mockAiProvider =
  new MockAiProvider();