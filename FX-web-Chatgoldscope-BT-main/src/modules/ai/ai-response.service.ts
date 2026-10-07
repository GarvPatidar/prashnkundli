import type {
  ChatRequest,
  AnalysisResult,
} from "../../types.js";

import {
  communicationOutputService,
  CommunicationOutputError,
} from "../communication/communication-output.service.js";

import type {
  ResponseMode,
  UserFacingAnalysis,
} from "../communication/communication.types.js";

import {
  attachmentService,
} from "../attachments/attachment.service.js";

import {
  aiOrchestrationService,
  type PreparedAiAnalysis,
} from "./ai-orchestration.service.js";

import {
  aiProvider,
} from "./ai.factory.js";

import {
  isTradeIdeaRequest,
} from "../communication/communication.service.js";

import type {
  TradeScenario,
} from "../analysis/trade-scenarios.js";

import type {
  AiImageAttachment,
} from "./ai.provider.js";

export interface GenerateAiResponseInput {
  userId:
    string;

  request:
    ChatRequest;
}

export interface GeneratedAiResponse {
  analysis:
    AnalysisResult;

  response:
    UserFacingAnalysis;

  responseMode:
    ResponseMode;

  message:
    string;

  prepared:
    PreparedAiAnalysis;

  metadata: {
    symbol:
      "XAUUSD";

    primaryTimeframe:
      "M15";

    marketAvailable:
      boolean;

    marketConfidence:
      number | null;

    finalConfidence:
      number | null;

    riskScore:
      number | null;

    newsRiskWindow:
      boolean;

    session:
      string;

    traderExperience:
      PreparedAiAnalysis[
        "metadata"
      ][
        "traderExperience"
      ];

    emotionalState:
      PreparedAiAnalysis[
        "metadata"
      ][
        "emotionalState"
      ];

    communicationMode:
      PreparedAiAnalysis[
        "metadata"
      ][
        "communicationMode"
      ];

    decisionState:
      UserFacingAnalysis[
        "decision"
      ];

    generatedAt:
      string;
  };
}

export type AiResponseServiceErrorCode =
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENT_READ_FAILED"
  | "AI_PROVIDER_FAILED"
  | "FINAL_RESPONSE_FAILED";

export class AiResponseServiceError
  extends Error {
  constructor(
    message:
      string,

    public readonly code:
      AiResponseServiceErrorCode,

    public readonly cause?:
      unknown,
  ) {
    super(message);

    this.name =
      "AiResponseServiceError";
  }
}

function requestsFullAnalysis(
  message:
    string,
): boolean {
  const normalized =
    message
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9\s/.-]/g,
        " ",
      )
      .replace(
        /\s+/g,
        " ",
      );

  const explicitPhrases = [
    "full analysis",
    "complete analysis",
    "detailed analysis",
    "deep analysis",
    "full market analysis",
    "complete market analysis",
    "detailed market analysis",
    "technical analysis",
    "market outlook",
    "complete outlook",
    "detailed outlook",
    "analyse market",
    "analyze market",
  ] as const;

  if (
    explicitPhrases.some(
      (
        phrase,
      ) =>
        normalized.includes(
          phrase,
        ),
    )
  ) {
    return true;
  }

  const asksForDepth =
    normalized.includes(
      "full",
    ) ||
    normalized.includes(
      "complete",
    ) ||
    normalized.includes(
      "detailed",
    ) ||
    normalized.includes(
      "deep",
    ) ||
    normalized.includes(
      "technical",
    );

  const asksForAnalysis =
    normalized.includes(
      "analysis",
    ) ||
    normalized.includes(
      "analyse",
    ) ||
    normalized.includes(
      "analyze",
    ) ||
    normalized.includes(
      "outlook",
    );

  return (
    asksForDepth &&
    asksForAnalysis
  );
}

function resolveResponseMode(
  prepared:
    PreparedAiAnalysis,

  request:
    ChatRequest,
): ResponseMode {
  /*
   * Never render the full market-analysis card
   * when verified live market intelligence is
   * unavailable.
   */
  if (
    !prepared.metadata
      .marketAvailable
  ) {
    return "CONVERSATIONAL";
  }

  if (
    requestsFullAnalysis(
      request.message,
    )
  ) {
    return "ANALYSIS";
  }

  return "CONVERSATIONAL";
}

function buildConversationalMessage(
  analysis:
    AnalysisResult,

  prepared:
    PreparedAiAnalysis,
): string {
  switch (
    prepared.communication.mode
  ) {
    case "POSITION_REVIEW":
      return [
        analysis.positionStatus,
        analysis.nextStep,
      ]
        .filter(Boolean)
        .join(" ");

    case "RISK_WARNING":
      return [
        analysis.mainRisk,
        analysis.nextStep,
      ]
        .filter(Boolean)
        .join(" ");

    case "EDUCATION":
    case "CASUAL":
    case "MARKET_ANALYSIS":
      return analysis.marketCondition;
  }
}

function formatPrice(
  value: number,
): string {
  return value.toFixed(2);
}

function formatRiskReward(
  values: number[],
): string {
  return values
    .map(
      (value) =>
        `1:${value.toFixed(1)}`,
    )
    .join(" / ");
}

function formatScenario(
  scenario: TradeScenario,
  index: number,
): string {
  const label =
    scenario.alignedWithBias
      ? "with the current bias"
      : "counter-trend, lower probability";

  return [
    `Plan ${index + 1}: ${scenario.title} (${label})`,
    `When: ${scenario.condition}`,
    `Entry ${formatPrice(scenario.entry)} | Stop loss ${formatPrice(scenario.stopLoss)} | Targets ${scenario.targets.map(formatPrice).join(" / ")}`,
    `Risk ${scenario.riskPoints.toFixed(2)} points | Reward-to-risk ${formatRiskReward(scenario.riskReward)}`,
    `Invalid if: ${scenario.invalidation}`,
  ].join("\n");
}

function titleCase(
  value: string,
): string {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

/*
 * Trade-idea answers are assembled from the backend trade
 * scenarios, not from model prose, so every entry, stop and
 * target is guaranteed to be a supplied number and always
 * reaches the trader.
 *
 * Returns null when no usable plan exists so the caller can
 * fall back to the normal conversational message.
 */
function buildTradeIdeaMessage(
  prepared:
    PreparedAiAnalysis,
): string | null {
  const market =
    prepared.context.market;

  const set =
    market?.tradeScenarios;

  if (
    !market ||
    !set ||
    !set.available ||
    set.scenarios.length === 0
  ) {
    return null;
  }

  const { decisionState, marketConfidence, riskScore } =
    prepared.metadata;

  const confidenceText =
    marketConfidence !== null
      ? ` (confidence ${Math.round(marketConfidence)}%)`
      : "";

  const lines: string[] = [
    `Current bias: ${titleCase(decisionState)}${confidenceText}. Price now ${formatPrice(set.referencePrice)}.`,
    "Short answer: do not chase an entry at the current price. Both plans below need price to reach the level and confirm first.",
    "",
    ...set.scenarios.flatMap(
      (scenario, index) => [
        formatScenario(
          scenario,
          index,
        ),
        "",
      ],
    ),
  ];

  if (
    decisionState === "AVOID" ||
    (riskScore !== null &&
      riskScore >= 60)
  ) {
    lines.push(
      "Risk conditions are elevated right now, so treat these as reference levels, not a signal to enter.",
      "",
    );
  }

  if (
    !prepared.context.news
      .calendarConnected
  ) {
    lines.push(
      "The economic calendar is not connected yet, so check CPI, NFP and Fed events yourself before trading.",
      "",
    );
  }

  lines.push(
    "These are conditional example plans from market structure, not personal advice. Set your position size from the entry-to-stop distance and your own risk using the Risk Calculator.",
  );

  return lines.join("\n");
}

function buildDegradedMessage(
  analysis:
    AnalysisResult,

  request:
    ChatRequest,
): string {
  if (
    request.attachment
  ) {
    return [
      analysis.positionStatus,
      analysis.mainRisk,
      analysis.nextStep,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    analysis.marketCondition,
    analysis.nextStep,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildDegradedResponse(
  analysis:
    AnalysisResult,
): UserFacingAnalysis {
  return {
    headline:
      "Position review",

    /*
     * Safety placeholder only.
     * Not a live market-direction conclusion.
     */
    decision:
      "WAIT",

    action:
      "WAIT",

    confidence:
      null,

    summary:
      analysis.marketCondition,

    whatMarketIsShowing:
      analysis.marketCondition,

    primaryRisk:
      analysis.mainRisk,

    whatWouldStrengthenTheSetup:
      analysis.bullishScenario,

    whatWouldWeakenTheSetup:
      analysis.bearishScenario,

    nextStep:
      analysis.nextStep,

    traderNote:
      analysis.positionStatus ||
      null,

    disclaimer:
      analysis.disclaimer,
  };
}

function buildSafeFallback(
  prepared:
    PreparedAiAnalysis,
): UserFacingAnalysis {
  const {
    decisionState,
    marketConfidence,
    riskScore,
  } =
    prepared.metadata;

  const isElevatedRisk =
    riskScore !== null &&
    riskScore >= 60;

  const action:
    UserFacingAnalysis[
      "action"
    ] =
      isElevatedRisk
        ? "AVOID"
        : "WAIT";

  const decision:
    UserFacingAnalysis[
      "decision"
    ] =
      isElevatedRisk
        ? "AVOID"
        : decisionState;

  return {
    headline:
      isElevatedRisk
        ? "Current conditions call for caution"
        : "More confirmation is needed",

    decision,

    action,

    confidence:
      marketConfidence,

    summary:
      isElevatedRisk
        ? "Current verified conditions contain enough risk that protecting capital should take priority."
        : "The current verified market picture does not justify forcing a trade without additional confirmation.",

    whatMarketIsShowing:
      "GoldScope could not present the generated analysis with the required communication standards.",

    primaryRisk:
      isElevatedRisk
        ? "Verified risk conditions are elevated."
        : "Entering without sufficient confirmation may expose the trade to unnecessary risk.",

    whatWouldStrengthenTheSetup:
      "Stronger verified directional confirmation would improve setup quality.",

    whatWouldWeakenTheSetup:
      "Conflicting price behaviour or deterioration in verified market structure would weaken the setup.",

    nextStep:
      isElevatedRisk
        ? "Avoid fresh exposure until verified risk conditions improve."
        : "Wait for clearer verified confirmation before committing capital.",

    traderNote:
      null,

    disclaimer:
      "Market decision-support only. Verify live execution conditions and your own risk limits before acting.",
  };
}

async function resolveAiAttachment(
  userId:
    string,

  request:
    ChatRequest,
): Promise<
  AiImageAttachment | null
> {
  if (
    !request.attachment
  ) {
    return null;
  }

  const storedAttachment =
    await attachmentService
      .getForUser(
        request.attachment.id,
        userId,
      );

  if (
    !storedAttachment
  ) {
    throw new AiResponseServiceError(
      "The attached screenshot could not be found.",
      "ATTACHMENT_NOT_FOUND",
    );
  }

  if (
    storedAttachment
      .mimeType !==
      request.attachment
        .mimeType ||
    storedAttachment
      .size !==
      request.attachment
        .size
  ) {
    throw new AiResponseServiceError(
      "The attached screenshot metadata does not match the stored file.",
      "ATTACHMENT_NOT_FOUND",
    );
  }

  try {
    const dataUrl =
      await attachmentService
        .readAsDataUrl(
          storedAttachment,
        );

    return {
      mimeType:
        storedAttachment
          .mimeType,

      dataUrl,
    };
  } catch (error) {
    throw new AiResponseServiceError(
      "The attached screenshot could not be prepared for analysis.",
      "ATTACHMENT_READ_FAILED",
      error,
    );
  }
}

export class AiResponseService {
  async generate(
    input:
      GenerateAiResponseInput,
  ): Promise<GeneratedAiResponse> {
    const prepared =
      await aiOrchestrationService
        .prepare({
          userId:
            input.userId,

          request:
            input.request,
        });

    const attachment =
      await resolveAiAttachment(
        input.userId,
        input.request,
      );

    let analysis:
      AnalysisResult;

    try {
      analysis =
        await aiProvider.analyse({
          context:
            prepared.context,

          prompt:
            prepared.prompt,

          attachment,
        });
    } catch (error) {
      if (
        error instanceof
        AiResponseServiceError
      ) {
        throw error;
      }

      throw new AiResponseServiceError(
        "GoldScope AI could not generate the requested analysis.",
        "AI_PROVIDER_FAILED",
        error,
      );
    }

    let response:
      UserFacingAnalysis;

    if (
      !prepared.metadata
        .marketAvailable
    ) {
      /*
       * Do not run normal market communication
       * policy against unavailable market data.
       */
      response =
        buildDegradedResponse(
          analysis,
        );
    } else {
      try {
        response =
          communicationOutputService
            .finalize({
              analysis,

              communication:
                prepared.communication,
            });
      } catch (error) {
        if (
          error instanceof
          CommunicationOutputError
        ) {
          response =
            buildSafeFallback(
              prepared,
            );
        } else {
          throw new AiResponseServiceError(
            "GoldScope could not prepare the final response.",
            "FINAL_RESPONSE_FAILED",
            error,
          );
        }
      }
    }

    /*
     * Without a screenshot or supplied position there is nothing
     * to say about a position, so do not show a note about it.
     */
    if (
      !input.request.attachment &&
      !input.request.position
    ) {
      response = {
        ...response,
        traderNote: null,
      };
    }

    const responseMode =
      resolveResponseMode(
        prepared,
        input.request,
      );

    const message =
      !prepared.metadata
        .marketAvailable
        ? buildDegradedMessage(
            analysis,
            input.request,
          )
        : responseMode ===
            "ANALYSIS"
          ? response.summary
          : (!input.request.position &&
              !input.request.attachment &&
              isTradeIdeaRequest(
                input.request.message,
              )
                ? buildTradeIdeaMessage(
                    prepared,
                  )
                : null) ??
            buildConversationalMessage(
              analysis,
              prepared,
            );

    return {
      analysis,

      response,

      responseMode,

      message,

      prepared,

      metadata: {
        symbol:
          "XAUUSD",

        primaryTimeframe:
          "M15",

        marketAvailable:
          prepared.metadata
            .marketAvailable,

        marketConfidence:
          prepared.metadata
            .marketConfidence,

        finalConfidence:
          response.confidence,

        riskScore:
          prepared.metadata
            .riskScore,

        newsRiskWindow:
          prepared.metadata
            .newsRiskWindow,

        session:
          prepared.metadata
            .session,

        traderExperience:
          prepared.metadata
            .traderExperience,

        emotionalState:
          prepared.metadata
            .emotionalState,

        communicationMode:
          prepared.metadata
            .communicationMode,

        decisionState:
          response.decision,

        generatedAt:
          new Date()
            .toISOString(),
      },
    };
  }
}

export const aiResponseService =
  new AiResponseService();