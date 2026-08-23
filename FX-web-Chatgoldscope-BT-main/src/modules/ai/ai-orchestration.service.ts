import type {
  ChatRequest,
  TraderProfileContext,
} from "../../types.js";

import {
  marketIntelligenceOrchestrator,
} from "../analysis/market-intelligence-orchestrator.service.js";

import type {
  MarketIntelligenceResult,
} from "../analysis/market-intelligence.service.js";

import {
  communicationService,
  determineCommunicationMode,
} from "../communication/communication.service.js";

import type {
  CommunicationProfile,
  CommunicationTone,
} from "../communication/communication.types.js";

import {
  newsService,
} from "../news/news.factory.js";

import {
  personalityService,
} from "../personality/personality.service.js";

import type {
  PersonalityContext,
} from "../personality/personality.types.js";

import {
  riskService,
} from "../risk/risk.service.js";

import type {
  RiskAssessmentResult,
} from "../risk/risk.types.js";

import {
  sessionService,
} from "../sessions/session.service.js";

import {
  traderProfileRepository,
} from "../users/trader-profile.repository.js";

import {
  aiContextBuilderService,
  type GoldScopeAiContext,
} from "./context-builder.service.js";

import {
  promptBuilderService,
  type AiPrompt,
} from "./prompt-builder.service.js";

export interface PrepareAiAnalysisInput {
  userId:
    string;

  request:
    ChatRequest;
}

export interface PreparedAiAnalysis {
  context:
    GoldScopeAiContext;

  personality:
    PersonalityContext;

  communication:
    CommunicationProfile;

  prompt:
    AiPrompt;

  metadata: {
    symbol:
      "XAUUSD";

    primaryTimeframe:
      "M15";

    marketAvailable:
      boolean;

    marketUnavailableReason:
      string | null;

    marketConfidence:
      number | null;

    riskScore:
      number | null;

    newsRiskWindow:
      boolean;

    session:
      string;

    traderExperience:
      PersonalityContext[
        "trader"
      ];

    emotionalState:
      PersonalityContext[
        "emotion"
      ];

    communicationMode:
      CommunicationProfile[
        "mode"
      ];

    decisionState:
      CommunicationProfile[
        "decisionState"
      ];

    generatedAt:
      string;
  };
}

export type AiOrchestrationErrorCode =
  | "INVALID_USER_ID"
  | "AI_CONTEXT_PREPARATION_FAILED";

export class AiOrchestrationError
  extends Error {
  constructor(
    message:
      string,

    public readonly code:
      AiOrchestrationErrorCode,

    public readonly cause?:
      unknown,
  ) {
    super(message);

    this.name =
      "AiOrchestrationError";
  }
}

interface MarketLoadResult {
  marketIntelligence:
    MarketIntelligenceResult | null;

  error:
    unknown | null;
}

function validateUserId(
  userId:
    string,
): string {
  const normalized =
    userId.trim();

  if (
    !normalized
  ) {
    throw new AiOrchestrationError(
      "Authenticated user ID is required.",
      "INVALID_USER_ID",
    );
  }

  return normalized;
}

function mapTraderProfile(
  profile:
    Awaited<
      ReturnType<
        typeof traderProfileRepository.findByUserId
      >
    >,
): TraderProfileContext | null {
  if (
    !profile
  ) {
    return null;
  }

  return {
    experienceLevel:
      profile.experienceLevel,

    tradingStyle:
      profile.tradingStyle,

    accountSize:
      profile.accountSize,

    mainChallenge:
      profile.mainChallenge,

    preferredTimeframe:
      profile.preferredTimeframe,

    riskTolerance:
      profile.riskTolerance,

    timezone:
      profile.timezone,

    country:
      profile.country,

    onboardingCompleted:
      profile.onboardingCompleted,
  };
}

async function loadMarketIntelligence():
  Promise<MarketLoadResult> {
  try {
    const marketIntelligence =
      await marketIntelligenceOrchestrator.generate(
        {
          symbol:
            "XAUUSD",

          candleLimit:
            300,
        },
      );

    return {
      marketIntelligence,

      error:
        null,
    };
  } catch (error) {
    /*
     * Market-provider failure is degraded mode,
     * not a complete AI-request failure.
     */
    return {
      marketIntelligence:
        null,

      error,
    };
  }
}

function determineFallbackTone(
  traderProfile:
    TraderProfileContext | null,
): CommunicationTone {
  switch (
    traderProfile?.experienceLevel
  ) {
    case "BEGINNER":
      return "SIMPLE";

    case "ADVANCED":
      return "PROFESSIONAL";

    case "INTERMEDIATE":
    case null:
    default:
      return "BALANCED";
  }
}

function createDegradedCommunicationProfile(
  request:
    ChatRequest,

  traderProfile:
    TraderProfileContext | null,

  personality:
    PersonalityContext,
): CommunicationProfile {
  return {
    mode:
      determineCommunicationMode(
        request,
      ),

    tone:
      determineFallbackTone(
        traderProfile,
      ),

    /*
     * WAIT here is a safety state only.
     *
     * It must not be interpreted as an actual
     * neutral market signal when live market
     * intelligence is unavailable.
     */
    decisionState:
      "WAIT",

    allowTechnicalTerms:
      traderProfile
        ?.experienceLevel ===
      "ADVANCED",

    prioritizeCapitalProtection:
      true,

    acknowledgeUserEmotion:
      personality.emotion !==
      "NORMAL",
  };
}

function getSafeMarketUnavailableMessage():
  string {
  return (
    "Live XAU/USD market intelligence is temporarily unavailable. " +
    "Do not infer a live market direction from unavailable data."
  );
}

export class AiOrchestrationService {
  async prepare(
    input:
      PrepareAiAnalysisInput,
  ): Promise<PreparedAiAnalysis> {
    const userId =
      validateUserId(
        input.userId,
      );

    try {
      /*
       * Market-data failure is isolated so it
       * cannot automatically destroy screenshot
       * analysis or other conversation handling.
       */
      const [
        marketLoad,
        news,
        traderProfileRecord,
      ] =
        await Promise.all([
          loadMarketIntelligence(),

          newsService.getContext(),

          traderProfileRepository
            .findByUserId(
              userId,
            ),
        ]);

      const traderProfile =
        mapTraderProfile(
          traderProfileRecord,
        );

      const personality =
        personalityService.createContext(
          {
            request:
              input.request,

            traderProfile,
          },
        );

      const session =
        sessionService.getContext();

      const marketIntelligence =
        marketLoad
          .marketIntelligence;

      let risk:
        RiskAssessmentResult | null =
          null;

      let communication:
        CommunicationProfile;

      if (
        marketIntelligence
      ) {
        risk =
          riskService.assess({
            marketIntelligence,

            newsRiskWindow:
              news.newsRiskWindow,

            minutesToHighImpactEvent:
              news
                .minutesToNextHighImpactEvent,

            liquidityState:
              session.liquidity,

            spreadPercent:
              null,
          });

        communication =
          communicationService.createProfile(
            {
              request:
                input.request,

              traderProfile,

              confluence:
                marketIntelligence
                  .confluence,

              risk,
            },
          );
      } else {
        /*
         * No fake market confluence.
         * No fake risk score.
         * No fake BUY/SELL market bias.
         */
        communication =
          createDegradedCommunicationProfile(
            input.request,
            traderProfile,
            personality,
          );
      }

      const marketUnavailableReason =
        marketIntelligence
          ? null
          : getSafeMarketUnavailableMessage();

      const context =
        aiContextBuilderService.build({
          request:
            input.request,

          traderProfile,

          marketIntelligence,

          risk,

          session,

          news,

          marketUnavailableReason,
        });

      const prompt =
        promptBuilderService.build(
          context,
          {
            personality,

            communication,
          },
        );

      return {
        context,

        personality,

        communication,

        prompt,

        metadata: {
          symbol:
            "XAUUSD",

          primaryTimeframe:
            "M15",

          marketAvailable:
            Boolean(
              marketIntelligence,
            ),

          marketUnavailableReason,

          marketConfidence:
            marketIntelligence
              ? marketIntelligence
                  .summary
                  .confidence
              : null,

          riskScore:
            risk
              ? risk.riskScore
              : null,

          newsRiskWindow:
            news.newsRiskWindow,

          session:
            session.session,

          traderExperience:
            personality.trader,

          emotionalState:
            personality.emotion,

          communicationMode:
            communication.mode,

          decisionState:
            communication
              .decisionState,

          generatedAt:
            new Date()
              .toISOString(),
        },
      };
    } catch (error) {
      if (
        error instanceof
        AiOrchestrationError
      ) {
        throw error;
      }

      throw new AiOrchestrationError(
        "GoldScope AI analysis context could not be prepared.",
        "AI_CONTEXT_PREPARATION_FAILED",
        error,
      );
    }
  }
}

export const aiOrchestrationService =
  new AiOrchestrationService();