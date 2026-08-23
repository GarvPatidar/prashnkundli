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
          : buildConversationalMessage(
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