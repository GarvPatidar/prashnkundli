import type {
  ChatAttachment,
  ChatMessage,
} from "../types";

export function createUserMessage(
  conversationId: string,
  content: string,
  attachments: ChatAttachment[] = [],
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    role: "user",
    status: "completed",
    content,
    attachments,
    createdAt: new Date().toISOString(),
  };
}

export function createAssistantPlaceholder(
  conversationId: string,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    role: "assistant",
    status: "streaming",
    content: "",
    attachments: [],
    createdAt: new Date().toISOString(),
  };
}