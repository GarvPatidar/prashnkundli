import type {
  ChatRequest,
  TraderProfileContext,
} from "../../types.js";

import type {
  MarketIntelligenceResult,
} from "../analysis/market-intelligence.service.js";

import type {
  NewsContext,
} from "../news/news.types.js";

import type {
  RiskAssessmentResult,
} from "../risk/risk.types.js";

import type {
  MarketSessionContext,
} from "../sessions/session.types.js";

type MarketSnapshots =
  MarketIntelligenceResult[
    "marketAnalysis"
  ]["snapshots"];

type MarketTimeframe =
  keyof MarketSnapshots;

type MarketSnapshot =
  MarketSnapshots[
    MarketTimeframe
  ];

export type MarketAvailabilityReason =
  | "AVAILABLE"
  | "PROVIDER_UNAVAILABLE";

export interface MarketAvailabilityContext {
  available: boolean;

  reason:
    MarketAvailabilityReason;

  message:
    string | null;
}

export interface AiContextBuilderInput {
  request:
    ChatRequest;

  traderProfile:
    TraderProfileContext | null;

  marketIntelligence:
    MarketIntelligenceResult | null;

  risk:
    RiskAssessmentResult | null;

  session:
    MarketSessionContext;

  news:
    NewsContext;

  marketUnavailableReason?:
    string | null;
}

export interface AiTimeframeContext {
  metadata: {
    timeframe:
      MarketTimeframe;

    candleCount:
      number;

    hasRecommendedHistory:
      boolean;

    latestCandleAt:
      string;

    latestClose:
      number;
  };

  trend:
    MarketSnapshot[
      "structure"
    ]["trend"];

  volatility:
    MarketSnapshot[
      "structure"
    ]["volatility"];

  directionalStrength:
    MarketSnapshot[
      "adx14"
    ]["strength"];

  momentumCondition:
    MarketSnapshot[
      "rsi14"
    ]["condition"];

  shortTermMomentumCondition:
    MarketSnapshot[
      "stochastic"
    ]["condition"];

  supports:
    MarketSnapshot[
      "structure"
    ]["supports"];

  resistances:
    MarketSnapshot[
      "structure"
    ]["resistances"];
}

export interface AiMarketContext {
  symbol:
    "XAUUSD";

  primaryTimeframe:
    "M15";

  currentMarket: {
    direction:
      MarketIntelligenceResult[
        "summary"
      ]["direction"];

    bias:
      MarketIntelligenceResult[
        "summary"
      ]["bias"];

    confidence:
      number;

    bullishScore:
      number;

    bearishScore:
      number;

    neutralScore:
      number;

    higherTimeframeAgreement:
      boolean;

    agreementScore:
      number;
  };

  timeframes: {
    M15:
      AiTimeframeContext;

    H1:
      AiTimeframeContext;

    H4:
      AiTimeframeContext;

    D1:
      AiTimeframeContext;
  };

  conflicts:
    string[];

  warnings:
    string[];

  strongestSignals:
    string[];

  dataQuality:
    MarketIntelligenceResult[
      "dataQuality"
    ];
}

export interface AiRiskContext {
  overallRisk:
    RiskAssessmentResult[
      "overallRisk"
    ];

  tradeEnvironment:
    RiskAssessmentResult[
      "tradeEnvironment"
    ];

  riskScore:
    number;

  factors:
    RiskAssessmentResult[
      "factors"
    ];

  warnings:
    string[];
}

export interface AiSessionContext {
  session:
    MarketSessionContext[
      "session"
    ];

  liquidity:
    MarketSessionContext[
      "liquidity"
    ];

  isOverlap:
    boolean;

  minutesUntilNextSessionChange:
    number | null;

  warnings:
    string[];
}

export interface AiNewsContext {
  newsRiskWindow:
    boolean;

  overallImpact:
    NewsContext[
      "overallImpact"
    ];

  minutesToNextHighImpactEvent:
    number | null;

  nextHighImpactEvent:
    NewsContext[
      "nextHighImpactEvent"
    ];

  highImpactEventsNext24h:
    NewsContext[
      "highImpactEventsNext24h"
    ];

  recentHeadlines:
    NewsContext[
      "recentHeadlines"
    ];

  warnings:
    string[];
}

export interface GoldScopeAiContext {
  version:
    "1.1";

  symbol:
    "XAUUSD";

  user: {
    question:
      string;

    conversationContext:
      ChatRequest[
        "conversationContext"
      ];

    position:
      ChatRequest[
        "position"
      ];

    attachment:
      ChatRequest[
        "attachment"
      ];

    traderProfile:
      TraderProfileContext | null;
  };

  marketAvailability:
    MarketAvailabilityContext;

  /*
   * Null is intentional.
   *
   * GoldScope must never manufacture live
   * market intelligence when the provider is
   * unavailable.
   */
  market:
    AiMarketContext | null;

  risk:
    AiRiskContext | null;

  session:
    AiSessionContext;

  news:
    AiNewsContext;

  analysisRules: {
    useOnlyProvidedMarketData:
      true;

    doNotInventPrices:
      true;

    doNotInventIndicators:
      true;

    doNotInventEconomicEvents:
      true;

    acknowledgeMissingData:
      true;

    prioritizeRiskBeforeOpportunity:
      true;

    respectHigherTimeframeConflicts:
      true;

    adaptToTraderProfile:
      true;

    useConversationContext:
      true;

    doNotAskForKnownConversationFacts:
      true;

    doNotInferLiveMarketWhenUnavailable:
      true;

    separateScreenshotFactsFromMarketFacts:
      true;
  };

  generatedAt:
    string;
}

function buildTimeframeContext(
  timeframe:
    MarketTimeframe,

  snapshot:
    MarketSnapshot,
): AiTimeframeContext {
  return {
    metadata: {
      timeframe,

      candleCount:
        snapshot.metadata
          .candleCount,

      hasRecommendedHistory:
        snapshot.metadata
          .hasRecommendedHistory,

      latestCandleAt:
        snapshot.metadata
          .latestCandleAt,

      latestClose:
        snapshot.metadata
          .latestClose,
    },

    trend:
      snapshot.structure
        .trend,

    volatility:
      snapshot.structure
        .volatility,

    directionalStrength:
      snapshot.adx14
        .strength,

    momentumCondition:
      snapshot.rsi14
        .condition,

    shortTermMomentumCondition:
      snapshot.stochastic
        .condition,

    supports:
      snapshot.structure
        .supports,

    resistances:
      snapshot.structure
        .resistances,
  };
}

function buildMarketContext(
  marketIntelligence:
    MarketIntelligenceResult,
): AiMarketContext {
  const snapshots =
    marketIntelligence
      .marketAnalysis
      .snapshots;

  return {
    symbol:
      "XAUUSD",

    primaryTimeframe:
      marketIntelligence
        .primaryTimeframe,

    currentMarket: {
      direction:
        marketIntelligence
          .summary
          .direction,

      bias:
        marketIntelligence
          .summary
          .bias,

      confidence:
        marketIntelligence
          .summary
          .confidence,

      bullishScore:
        marketIntelligence
          .summary
          .bullishScore,

      bearishScore:
        marketIntelligence
          .summary
          .bearishScore,

      neutralScore:
        marketIntelligence
          .summary
          .neutralScore,

      higherTimeframeAgreement:
        marketIntelligence
          .summary
          .higherTimeframeAgreement,

      agreementScore:
        marketIntelligence
          .summary
          .agreementScore,
    },

    timeframes: {
      M15:
        buildTimeframeContext(
          "M15",
          snapshots.M15,
        ),

      H1:
        buildTimeframeContext(
          "H1",
          snapshots.H1,
        ),

      H4:
        buildTimeframeContext(
          "H4",
          snapshots.H4,
        ),

      D1:
        buildTimeframeContext(
          "D1",
          snapshots.D1,
        ),
    },

    conflicts:
      marketIntelligence
        .summary
        .conflicts,

    warnings:
      marketIntelligence
        .summary
        .warnings,

    strongestSignals:
      marketIntelligence
        .summary
        .strongestSignals,

    dataQuality:
      marketIntelligence
        .dataQuality,
  };
}

function buildRiskContext(
  risk:
    RiskAssessmentResult,
): AiRiskContext {
  return {
    overallRisk:
      risk.overallRisk,

    tradeEnvironment:
      risk.tradeEnvironment,

    riskScore:
      risk.riskScore,

    factors:
      risk.factors,

    warnings:
      risk.warnings,
  };
}

function buildSessionContext(
  session:
    MarketSessionContext,
): AiSessionContext {
  return {
    session:
      session.session,

    liquidity:
      session.liquidity,

    isOverlap:
      session.isOverlap,

    minutesUntilNextSessionChange:
      session
        .minutesUntilNextSessionChange,

    warnings:
      session.warnings,
  };
}

function buildNewsContext(
  news:
    NewsContext,
): AiNewsContext {
  return {
    newsRiskWindow:
      news.newsRiskWindow,

    overallImpact:
      news.overallImpact,

    minutesToNextHighImpactEvent:
      news
        .minutesToNextHighImpactEvent,

    nextHighImpactEvent:
      news.nextHighImpactEvent,

    highImpactEventsNext24h:
      news
        .highImpactEventsNext24h,

    recentHeadlines:
      news.recentHeadlines,

    warnings:
      news.warnings,
  };
}

function buildMarketAvailability(
  marketIntelligence:
    MarketIntelligenceResult | null,

  reason:
    string | null | undefined,
): MarketAvailabilityContext {
  if (
    marketIntelligence
  ) {
    return {
      available:
        true,

      reason:
        "AVAILABLE",

      message:
        null,
    };
  }

  return {
    available:
      false,

    reason:
      "PROVIDER_UNAVAILABLE",

    /*
     * Do not expose raw provider/API details
     * to the model or client.
     */
    message:
      reason ??
      "Live XAU/USD market intelligence is temporarily unavailable.",
  };
}

export class AiContextBuilderService {
  build(
    input:
      AiContextBuilderInput,
  ): GoldScopeAiContext {
    return {
      version:
        "1.1",

      symbol:
        "XAUUSD",

      user: {
        question:
          input.request.message,

        conversationContext:
          input.request
            .conversationContext ??
          [],

        position:
          input.request
            .position ??
          null,

        attachment:
          input.request
            .attachment ??
          null,

        traderProfile:
          input.traderProfile,
      },

      marketAvailability:
        buildMarketAvailability(
          input.marketIntelligence,
          input.marketUnavailableReason,
        ),

      market:
        input.marketIntelligence
          ? buildMarketContext(
              input.marketIntelligence,
            )
          : null,

      risk:
        input.risk
          ? buildRiskContext(
              input.risk,
            )
          : null,

      session:
        buildSessionContext(
          input.session,
        ),

      news:
        buildNewsContext(
          input.news,
        ),

      analysisRules: {
        useOnlyProvidedMarketData:
          true,

        doNotInventPrices:
          true,

        doNotInventIndicators:
          true,

        doNotInventEconomicEvents:
          true,

        acknowledgeMissingData:
          true,

        prioritizeRiskBeforeOpportunity:
          true,

        respectHigherTimeframeConflicts:
          true,

        adaptToTraderProfile:
          true,

        useConversationContext:
          true,

        doNotAskForKnownConversationFacts:
          true,

        doNotInferLiveMarketWhenUnavailable:
          true,

        separateScreenshotFactsFromMarketFacts:
          true,
      },

      generatedAt:
        new Date()
          .toISOString(),
    };
  }
}

export const aiContextBuilderService =
  new AiContextBuilderService();