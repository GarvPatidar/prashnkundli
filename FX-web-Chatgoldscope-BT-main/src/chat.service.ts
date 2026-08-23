import { randomUUID } from "node:crypto";
import OpenAI from "openai";

import { env } from "./config.js";
import { aiResponseService } from "./modules/ai/ai-response.service.js";


import {
  casualResponseService,
} from "./modules/communication/casual-response.service.js";

import {
  determineCommunicationMode,
} from "./modules/communication/communication.service.js";

import type {
  ResponseMode,
  UserFacingAnalysis,
} from "./modules/communication/communication.types.js";

import {
  conversationRepository,
} from "./repository.js";

import type {
  ChatRequest,
  Conversation,
  ConversationContextMessage,
} from "./types.js";

const MAX_CONVERSATION_TITLE_LENGTH =
  60;

const CONVERSATION_TITLE_SUFFIX =
  "...";

/*
 * Keep recent context intentionally bounded.
 *
 * This prevents long conversations from making
 * prompts unnecessarily large while still
 * preserving immediate follow-up context.
 */
const MAX_CONVERSATION_CONTEXT_MESSAGES =
  10;

const MAX_CONTEXT_MESSAGE_LENGTH =
  2_500;

export interface ProgressEvent {
  type:
    | "analysis.started"
    | "profile.started"
    | "profile.ready"
    | "conversation.ready"
    | "market.started"
    | "market.ready"
    | "calendar.started"
    | "calendar.ready"
    | "ai.started"
    | "ai.ready"
    | "analysis.completed"
    | "analysis.failed";

  message:
    string;

  data?:
    unknown;
}

export interface ExecuteChatResult {
  conversationId:
    string;

  userMessageId:
    string;

  assistantMessageId:
    string;

  responseMode:
    ResponseMode;

  message:
    string;

  /*
   * Casual requests intentionally do not
   * generate structured market analysis.
   */
  analysis:
    UserFacingAnalysis | null;

  /*
   * Casual requests do not load live market
   * intelligence, so no market timestamp exists.
   */
  marketTimestamp:
    string | null;
}

export type ChatServiceErrorCode =
  | "INVALID_USER"
  | "INVALID_MESSAGE"
  | "CONVERSATION_NOT_FOUND"
  | "ANALYSIS_FAILED";

export class ChatServiceError
  extends Error {
  constructor(
    message:
      string,

    public readonly code:
      ChatServiceErrorCode,

    public readonly statusCode:
      number,

    public readonly cause?:
      unknown,
  ) {
    super(message);

    this.name =
      "ChatServiceError";
  }
}

function emitProgress(
  emit:
    | ((
        event:
          ProgressEvent,
      ) => void)
    | undefined,

  event:
    ProgressEvent,
): void {
  emit?.(
    event,
  );
}

function validateUserId(
  userId:
    string,
): string {
  const normalizedUserId =
    userId.trim();

  if (
    !normalizedUserId
  ) {
    throw new ChatServiceError(
      "Authenticated user ID is required.",
      "INVALID_USER",
      401,
    );
  }

  return normalizedUserId;
}

function normalizeMessage(
  message:
    string,
): string {
  const normalizedMessage =
    message
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    !normalizedMessage
  ) {
    throw new ChatServiceError(
      "Chat message cannot be empty.",
      "INVALID_MESSAGE",
      400,
    );
  }

  return normalizedMessage;
}

function createConversationTitle(
  message:
    string,
): string {
  if (
    message.length <=
    MAX_CONVERSATION_TITLE_LENGTH
  ) {
    return message;
  }

  const availableLength =
    MAX_CONVERSATION_TITLE_LENGTH -
    CONVERSATION_TITLE_SUFFIX.length;

  return `${message.slice(
    0,
    availableLength,
  )}${CONVERSATION_TITLE_SUFFIX}`;
}

async function resolveConversation(
  userId:
    string,

  request:
    ChatRequest,

  normalizedMessage:
    string,
): Promise<Conversation> {
  if (
    request.conversationId
  ) {
    const existingConversation =
      await conversationRepository.get(
        userId,
        request.conversationId,
      );

    if (
      !existingConversation
    ) {
      throw new ChatServiceError(
        "Conversation could not be found.",
        "CONVERSATION_NOT_FOUND",
        404,
      );
    }

    return existingConversation;
  }

  return conversationRepository.create(
    userId,

    createConversationTitle(
      normalizedMessage,
    ),
  );
}

async function markAssistantMessageFailed(
  userId:
    string,

  conversationId:
    string,

  assistantMessageId:
    string,
): Promise<void> {
  try {
    await conversationRepository.update(
      userId,
      conversationId,
      assistantMessageId,
      "The request could not be completed. Please try again.",
      "failed",
    );
  } catch {
    /*
     * Preserve the original failure.
     *
     * A secondary persistence failure must
     * never replace the error that actually
     * caused the request to fail.
     */
  }
}

function createBaseRequest(
  request:
    ChatRequest,

  normalizedMessage:
    string,
): ChatRequest {
  /*
   * Conversation context is always prepared
   * internally from the authenticated user's
   * stored conversation.
   *
   * Never trust conversationContext supplied
   * by a client request.
   */
  return {
    ...request,

    message:
      normalizedMessage,

    conversationContext:
      undefined,
  };
}

function limitContextMessage(
  content:
    string,
): string {
  const normalized =
    content
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    normalized.length <=
    MAX_CONTEXT_MESSAGE_LENGTH
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    MAX_CONTEXT_MESSAGE_LENGTH,
  )}...`;
}

function normalizeStoredAssistantContent(
  content:
    string,
): string {
  const normalized =
    content.trim();

  if (
    !normalized.startsWith(
      "{",
    )
  ) {
    return limitContextMessage(
      normalized,
    );
  }

  /*
   * Full analysis responses are persisted as
   * structured JSON.
   *
   * Do not send the entire card JSON back into
   * every future AI prompt. Convert it into only
   * the useful conversational context.
   */
  try {
    const parsed =
      JSON.parse(
        normalized,
      ) as {
        headline?:
          unknown;

        summary?:
          unknown;

        primaryRisk?:
          unknown;

        traderNote?:
          unknown;

        nextStep?:
          unknown;
      };

    const contextParts = [
      typeof parsed.headline ===
      "string"
        ? parsed.headline
        : null,

      typeof parsed.summary ===
      "string"
        ? parsed.summary
        : null,

      typeof parsed.primaryRisk ===
      "string"
        ? `Risk: ${parsed.primaryRisk}`
        : null,

      typeof parsed.traderNote ===
      "string"
        ? parsed.traderNote
        : null,

      typeof parsed.nextStep ===
      "string"
        ? `Next step: ${parsed.nextStep}`
        : null,
    ].filter(
      (
        value,
      ): value is string =>
        Boolean(
          value,
        ),
    );

    if (
      contextParts.length ===
      0
    ) {
      return limitContextMessage(
        normalized,
      );
    }

    return limitContextMessage(
      contextParts.join(
        " ",
      ),
    );
  } catch {
    return limitContextMessage(
      normalized,
    );
  }
}

function buildConversationContext(
  conversation:
    Conversation,
): ConversationContextMessage[] {
  return conversation.messages
    .filter(
      (
        message,
      ) =>
        message.status ===
          "completed" &&
        message.content
          .trim()
          .length >
          0,
    )
    .slice(
      -MAX_CONVERSATION_CONTEXT_MESSAGES,
    )
    .map(
      (
        message,
      ): ConversationContextMessage => ({
        role:
          message.role,

        content:
          message.role ===
          "assistant"
            ? normalizeStoredAssistantContent(
                message.content,
              )
            : limitContextMessage(
                message.content,
              ),
      }),
    );
}

function createContextAwareRequest(
  baseRequest:
    ChatRequest,

  conversation:
    Conversation,
): ChatRequest {
  const conversationContext =
    buildConversationContext(
      conversation,
    );

  return {
    ...baseRequest,

    conversationContext,
  };
}

function createPersistedAssistantContent(
  responseMode:
    ResponseMode,

  message:
    string,

  analysis:
    UserFacingAnalysis,
): string {
  /*
   * Conversational responses remain readable
   * directly in conversation history.
   *
   * Detailed analysis responses retain their
   * structured representation for future UI
   * reconstruction.
   */
  if (
    responseMode ===
    "ANALYSIS"
  ) {
    return JSON.stringify(
      analysis,
    );
  }

  return message;
}

async function completeCasualRequest(
  userId: string,
  conversationId: string,
  userMessageId: string,
  assistantMessageId: string,
  request: ChatRequest,
  emit?: (event: ProgressEvent) => void,
): Promise<ExecuteChatResult> {
  /*
   * Casual requests take a lightweight path.
   * They intentionally do NOT load market data, confluence, etc.
   * If OpenAI is enabled, we use it for a lightweight chat response.
   * Otherwise, we fallback to hardcoded mock patterns.
   */
  let casualMessage = "";

  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are GoldScope, a helpful AI trading copilot for XAU/USD. Answer casual greetings and general chat messages in a friendly, conversational way. Keep responses brief (under 2 sentences) and steer them back to Gold/trading help if appropriate."
          },
          { role: "user", content: request.message }
        ]
      });
      casualMessage = completion.choices[0]?.message?.content || "How can I help you with Gold or your XAU/USD trading today?";
    } catch {
      casualMessage = casualResponseService.createResponse(request);
    }
  } else {
    casualMessage = casualResponseService.createResponse(request);
  }

  await conversationRepository.update(
    userId,
    conversationId,
    assistantMessageId,
    casualMessage,
    "completed",
  );


  const result:
    ExecuteChatResult = {
      conversationId,

      userMessageId,

      assistantMessageId,

      responseMode:
        "CONVERSATIONAL",

      message:
        casualMessage,

      analysis:
        null,

      marketTimestamp:
        null,
    };

  emitProgress(
    emit,
    {
      type:
        "analysis.completed",

      message:
        "Response prepared",

      data:
        result,
    },
  );

  return result;
}

export async function executeChat(
  userId:
    string,

  request:
    ChatRequest,

  emit?:
    (
      event:
        ProgressEvent,
    ) => void,
): Promise<ExecuteChatResult> {
  const authenticatedUserId =
    validateUserId(
      userId,
    );

  const normalizedMessage =
    normalizeMessage(
      request.message,
    );

  /*
   * First normalize the client request.
   *
   * Conversation history is deliberately
   * removed here because the server builds
   * trusted history itself.
   */
  const baseRequest =
    createBaseRequest(
      request,
      normalizedMessage,
    );

  emitProgress(
    emit,
    {
      type:
        "analysis.started",

      message:
        "Request accepted",
    },
  );

  /*
   * Load the authenticated user's existing
   * conversation BEFORE storing the new message.
   *
   * This gives us only previous turns and avoids
   * duplicating the current user message in the
   * conversation context.
   */
  const conversation =
    await resolveConversation(
      authenticatedUserId,
      baseRequest,
      normalizedMessage,
    );

  /*
   * Build bounded recent conversation memory.
   *
   * Example:
   *
   * User:
   * "maine sell trade le liya hai"
   *
   * Later:
   * "ab 200 dollar loss mai hu cut kardu?"
   *
   * The AI now receives the earlier SELL context.
   */
  const normalizedRequest =
    createContextAwareRequest(
      baseRequest,
      conversation,
    );

  emitProgress(
    emit,
    {
      type:
        "conversation.ready",

      message:
        "Conversation context prepared",

      data: {
        conversationId:
          conversation.id,

        isNewConversation:
          !baseRequest
            .conversationId,

        contextMessageCount:
          normalizedRequest
            .conversationContext
            ?.length ??
          0,
      },
    },
  );

  const createdAt =
    new Date()
      .toISOString();

  const userMessageId =
    randomUUID();

  const assistantMessageId =
    randomUUID();

  /*
   * Persist current user message only AFTER
   * previous conversation context has already
   * been prepared.
   */
  await conversationRepository.add(
    authenticatedUserId,
    conversation.id,
    {
      id:
        userMessageId,

      conversationId:
        conversation.id,

      role:
        "user",

      status:
        "completed",

      content:
        normalizedMessage,

      createdAt,
    },
  );

  await conversationRepository.add(
    authenticatedUserId,
    conversation.id,
    {
      id:
        assistantMessageId,

      conversationId:
        conversation.id,

      role:
        "assistant",

      status:
        "streaming",

      content:
        "",

      createdAt,
    },
  );

  try {
    /*
     * Detect request mode before loading
     * expensive market intelligence.
     */
    const preliminaryMode =
      determineCommunicationMode(
        normalizedRequest,
      );

    /*
     * CASUAL FAST PATH
     */
    if (
      preliminaryMode ===
      "CASUAL"
    ) {
      return completeCasualRequest(
        authenticatedUserId,
        conversation.id,
        userMessageId,
        assistantMessageId,
        normalizedRequest,
        emit,
      );
    }

    /*
     * From this point onwards the request
     * genuinely requires market/trading
     * intelligence.
     */

    emitProgress(
      emit,
      {
        type:
          "profile.started",

        message:
          "Preparing relevant trading context",
      },
    );

    emitProgress(
      emit,
      {
        type:
          "market.started",

        message:
          "Reviewing current XAU/USD market context",
      },
    );

    emitProgress(
      emit,
      {
        type:
          "calendar.started",

        message:
          "Checking current market-event risk",
      },
    );

    emitProgress(
      emit,
      {
        type:
          "ai.started",

        message:
          "Preparing your response",
      },
    );

    /*
     * Authoritative GoldScope intelligence
     * pipeline.
     *
     * normalizedRequest now includes recent
     * trusted conversation context.
     */
    const aiResponse =
      await aiResponseService.generate({
        userId:
          authenticatedUserId,

        request:
          normalizedRequest,
      });

    emitProgress(
      emit,
      {
        type:
          "profile.ready",

        message:
          "Trading context prepared",
      },
    );

const latestM15CandleAt =
  aiResponse
    .prepared
    .context
    .market
    ?.timeframes
    .M15
    .metadata
    .latestCandleAt ??
  null;

    emitProgress(
      emit,
      {
        type:
          "market.ready",

        message:
          "Market context prepared",

        data: {
          symbol:
            "XAUUSD",

          timestamp:
            latestM15CandleAt,
        },
      },
    );

    emitProgress(
      emit,
      {
        type:
          "calendar.ready",

        message:
          "Market-event risk checked",

        data: {
          eventRiskActive:
            aiResponse
              .metadata
              .newsRiskWindow,
        },
      },
    );

    emitProgress(
      emit,
      {
        type:
          "ai.ready",

        message:
          "Response prepared",

        data: {
          responseMode:
            aiResponse
              .responseMode,

          decision:
            aiResponse
              .response
              .decision,

          confidence:
            aiResponse
              .response
              .confidence,
        },
      },
    );

    const persistedAssistantContent =
      createPersistedAssistantContent(
        aiResponse
          .responseMode,

        aiResponse
          .message,

        aiResponse
          .response,
      );

    await conversationRepository.update(
      authenticatedUserId,
      conversation.id,
      assistantMessageId,
      persistedAssistantContent,
      "completed",
    );

    const result:
      ExecuteChatResult = {
        conversationId:
          conversation.id,

        userMessageId,

        assistantMessageId,

        responseMode:
          aiResponse
            .responseMode,

        message:
          aiResponse
            .message,

        analysis:
          aiResponse
            .response,

        marketTimestamp:
          latestM15CandleAt,
      };

    emitProgress(
      emit,
      {
        type:
          "analysis.completed",

        message:
          "Request completed",

        data:
          result,
      },
    );

    return result;
  } catch (
    error
  ) {
    await markAssistantMessageFailed(
      authenticatedUserId,
      conversation.id,
      assistantMessageId,
    );

    /*
     * Never expose raw provider errors,
     * implementation details or proprietary
     * backend information to clients.
     */
    emitProgress(
      emit,
      {
        type:
          "analysis.failed",

        message:
          "The request could not be completed.",
      },
    );

    if (
      error instanceof
      ChatServiceError
    ) {
      throw error;
    }

    throw new ChatServiceError(
      "GoldScope could not complete this request.",
      "ANALYSIS_FAILED",
      502,
      error,
    );
  }
}