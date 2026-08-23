import {
  authenticatedFetch,
  AuthApiError,
} from "@/features/auth/auth.api";

import type {
  GoldScopeAnalysis,
  ResponseMode,
} from "./types/chat.types";

const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL;

if (!rawApiBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not configured.",
  );
}

const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");


export interface UploadChatAttachmentResponse {
  success: true;

  data: {
    id: string;

    fileName: string;

    mimeType:
      | "image/png"
      | "image/jpeg"
      | "image/webp";

    size: number;
  };
}

export interface SendChatRequest {
  conversationId?:
    | string
    | null;

  message: string;

  attachment?:
    | {
        id: string;

        fileName: string;

        mimeType:
          | "image/png"
          | "image/jpeg"
          | "image/webp";

        size: number;
      }
    | null;
}

export interface SendChatResponse {
  success: true;

  data: {
    conversationId: string;

    userMessageId?: string;

    assistantMessageId?: string;

    marketTimestamp?:
      | string
      | null;

    responseMode:
      ResponseMode;

    message: string;

    analysis:
      GoldScopeAnalysis;
  };
}

export interface BackendConversationMessage {
  id: string;

  conversationId: string;

  role:
    | "user"
    | "assistant"
    | "system";

  status:
    | "pending"
    | "streaming"
    | "completed"
    | "failed";

  content: string;

  createdAt: string;
}

export interface BackendConversation {
  id: string;

  title: string;

  symbol: string;

  messages:
    BackendConversationMessage[];

  createdAt: string;

  updatedAt: string;
}

interface GetConversationsResponse {
  success: true;

  data:
    BackendConversation[];
}

interface GetConversationResponse {
  success: true;

  data:
    BackendConversation;
}

interface ChatApiErrorResponse {
  success: false;

  error?: {
    code?: string;

    message?: string;
  };
}

export class ChatApiError
  extends Error {
  constructor(
    message: string,

    public readonly code:
      string,

    public readonly status:
      number,
  ) {
    super(message);

    this.name =
      "ChatApiError";
  }
}

async function readApiPayload<
  TSuccess,
>(
  response:
    Response,
): Promise<
  TSuccess |
  ChatApiErrorResponse
> {
  return (
    await response.json()
  ) as
    | TSuccess
    | ChatApiErrorResponse;
}

function throwApiError(
  payload:
    ChatApiErrorResponse,

  status:
    number,

  fallbackMessage:
    string,

  fallbackCode:
    string,
): never {
  throw new ChatApiError(
    payload.error?.message ??
      fallbackMessage,

    payload.error?.code ??
      fallbackCode,

    status,
  );
}

export async function uploadChatAttachment(
  file:
    File,
): Promise<
  UploadChatAttachmentResponse
> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  let response:
    Response;

  try {
    response =
      await authenticatedFetch(
        `${API_BASE_URL}/v1/attachments`,
        {
          method:
            "POST",

          /*
           * Do not manually set Content-Type.
           *
           * The browser must create the multipart
           * boundary automatically.
           */
          body:
            formData,
        },
      );
  } catch (error) {
    if (
      error instanceof
      AuthApiError
    ) {
      throw new ChatApiError(
        error.message,
        error.code,
        error.status,
      );
    }

    throw error;
  }

  const payload =
    await readApiPayload<
      UploadChatAttachmentResponse
    >(
      response,
    );

  if (
    !response.ok ||
    !payload.success
  ) {
    throwApiError(
      payload as
        ChatApiErrorResponse,

      response.status,

      "The screenshot could not be uploaded.",

      "ATTACHMENT_UPLOAD_FAILED",
    );
  }

  return payload;
}

export async function sendChatMessage(
  input:
    SendChatRequest,
): Promise<
  SendChatResponse
> {
  let response:
    Response;

  try {
    response =
      await authenticatedFetch(
        `${API_BASE_URL}/v1/chat`,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              conversationId:
                input.conversationId ??
                null,

              message:
                input.message,

              attachment:
                input.attachment ??
                null,
            }),
        },
      );
  } catch (error) {
    if (
      error instanceof
      AuthApiError
    ) {
      throw new ChatApiError(
        error.message,
        error.code,
        error.status,
      );
    }

    throw error;
  }

  const payload =
    await readApiPayload<
      SendChatResponse
    >(
      response,
    );

  if (
    !response.ok ||
    !payload.success
  ) {
    throwApiError(
      payload as
        ChatApiErrorResponse,

      response.status,

      "GoldScope could not analyse this request.",

      "CHAT_REQUEST_FAILED",
    );
  }

  return payload;
}

export async function getConversations(
  signal?:
    AbortSignal,
): Promise<
  BackendConversation[]
> {
  let response:
    Response;

  try {
    response =
      await authenticatedFetch(
        `${API_BASE_URL}/v1/conversations`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache:
            "no-store",

          signal,
        },
      );
  } catch (error) {
    if (
      error instanceof
      AuthApiError
    ) {
      throw new ChatApiError(
        error.message,
        error.code,
        error.status,
      );
    }

    throw error;
  }

  const payload =
    await readApiPayload<
      GetConversationsResponse
    >(
      response,
    );

  if (
    !response.ok ||
    !payload.success
  ) {
    throwApiError(
      payload as
        ChatApiErrorResponse,

      response.status,

      "Conversation history could not be loaded.",

      "CONVERSATIONS_FETCH_FAILED",
    );
  }

  return payload.data;
}

export async function getConversation(
  conversationId:
    string,
): Promise<
  BackendConversation
> {
  let response:
    Response;

  try {
    response =
      await authenticatedFetch(
        `${API_BASE_URL}/v1/conversations/${encodeURIComponent(
          conversationId,
        )}`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache:
            "no-store",
        },
      );
  } catch (error) {
    if (
      error instanceof
      AuthApiError
    ) {
      throw new ChatApiError(
        error.message,
        error.code,
        error.status,
      );
    }

    throw error;
  }

  const payload =
    await readApiPayload<
      GetConversationResponse
    >(
      response,
    );

  if (
    !response.ok ||
    !payload.success
  ) {
    throwApiError(
      payload as
        ChatApiErrorResponse,

      response.status,

      "Conversation could not be loaded.",

      "CONVERSATION_FETCH_FAILED",
    );
  }

  return payload.data;
}

export async function deleteConversation(
  conversationId:
    string,
): Promise<void> {
  let response:
    Response;

  try {
    response =
      await authenticatedFetch(
        `${API_BASE_URL}/v1/conversations/${encodeURIComponent(
          conversationId,
        )}`,
        {
          method:
            "DELETE",

          headers: {
            Accept:
              "application/json",
          },
        },
      );
  } catch (error) {
    if (
      error instanceof
      AuthApiError
    ) {
      throw new ChatApiError(
        error.message,
        error.code,
        error.status,
      );
    }

    throw error;
  }

  if (
    response.status ===
    204
  ) {
    return;
  }

  let payload:
    ChatApiErrorResponse;

  try {
    payload =
      (await response.json()) as
        ChatApiErrorResponse;
  } catch {
    throw new ChatApiError(
      "Conversation could not be deleted.",
      "CONVERSATION_DELETE_FAILED",
      response.status,
    );
  }

  throwApiError(
    payload,

    response.status,

    "Conversation could not be deleted.",

    "CONVERSATION_DELETE_FAILED",
  );
}