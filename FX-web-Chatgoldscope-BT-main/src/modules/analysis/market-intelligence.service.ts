import {
  confluenceService,
  type ConfluenceResult,
} from "./confluence.service.js";
import {
  multiTimeframeService,
  type MultiTimeframeAnalysisResult,
  type MultiTimeframeCandleInput,
} from "./multi-timeframe.service.js";

export interface MarketIntelligenceResult {
  symbol: "XAUUSD";
  primaryTimeframe: "M15";

  marketAnalysis: MultiTimeframeAnalysisResult;
  confluence: ConfluenceResult;

  summary: {
    bias: ConfluenceResult["finalBias"];
    direction: ConfluenceResult["direction"];
    confidence: number;

    bullishScore: number;
    bearishScore: number;
    neutralScore: number;

    higherTimeframeAgreement: boolean;
    agreementScore: number;

    conflicts: string[];
    warnings: string[];
    strongestSignals: string[];
  };

  dataQuality: {
    complete: boolean;
    incompleteTimeframes: Array<
      keyof MultiTimeframeAnalysisResult["snapshots"]
    >;
    warnings: string[];
  };

  generatedAt: string;
}

export type MarketIntelligenceServiceErrorCode =
  | "MARKET_INTELLIGENCE_FAILED"
  | "INSUFFICIENT_MARKET_HISTORY";

export class MarketIntelligenceServiceError extends Error {
  constructor(
    message: string,
    public readonly code: MarketIntelligenceServiceErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MarketIntelligenceServiceError";
  }
}

function evaluateDataQuality(
  marketAnalysis: MultiTimeframeAnalysisResult,
): MarketIntelligenceResult["dataQuality"] {
  const entries = Object.entries(
    marketAnalysis.snapshots,
  ) as Array<
    [
      keyof MultiTimeframeAnalysisResult["snapshots"],
      MultiTimeframeAnalysisResult["snapshots"][
        keyof MultiTimeframeAnalysisResult["snapshots"]
      ],
    ]
  >;

  const incompleteTimeframes = entries
    .filter(
      ([, snapshot]) =>
        !snapshot.metadata.hasRecommendedHistory,
    )
    .map(([timeframe]) => timeframe);

  const warnings = incompleteTimeframes.map(
    (timeframe) =>
      `${timeframe} has fewer than the recommended number of candles. Long-period indicators may have limited warm-up history.`,
  );

  return {
    complete: incompleteTimeframes.length === 0,
    incompleteTimeframes,
    warnings,
  };
}

function createSummary(
  confluence: ConfluenceResult,
): MarketIntelligenceResult["summary"] {
  return {
    bias: confluence.finalBias,
    direction: confluence.direction,
    confidence: confluence.confidence,

    bullishScore: confluence.bullishScore,
    bearishScore: confluence.bearishScore,
    neutralScore: confluence.neutralScore,

    higherTimeframeAgreement:
      confluence.agreement
        .primaryAndHigherTimeframesAgree,

    agreementScore:
      confluence.agreement.agreementScore,

    conflicts: confluence.conflicts,
    warnings: confluence.warnings,
    strongestSignals:
      confluence.strongestSignals,
  };
}

export class MarketIntelligenceService {
  analyse(
    input: MultiTimeframeCandleInput,
  ): MarketIntelligenceResult {
    try {
      const marketAnalysis =
        multiTimeframeService.calculate(input);

      const confluence =
        confluenceService.calculate(
          marketAnalysis.snapshots,
        );

      const dataQuality =
        evaluateDataQuality(marketAnalysis);

      return {
        symbol: "XAUUSD",
        primaryTimeframe: "M15",

        marketAnalysis,
        confluence,

        summary: createSummary(confluence),
        dataQuality,

        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (
        error instanceof
        MarketIntelligenceServiceError
      ) {
        throw error;
      }

      throw new MarketIntelligenceServiceError(
        "XAU/USD market intelligence could not be generated.",
        "MARKET_INTELLIGENCE_FAILED",
        error,
      );
    }
  }
}

export const marketIntelligenceService =
  new MarketIntelligenceService();