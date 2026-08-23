import type { Conversation } from "../types";

const CONVERSATION_STORAGE_KEY = "goldscope_current_conversation";

export function loadStoredConversation(): Conversation | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedConversation = window.localStorage.getItem(
    CONVERSATION_STORAGE_KEY,
  );

  if (!storedConversation) {
    return null;
  }

  try {
    return JSON.parse(storedConversation) as Conversation;
  } catch {
    window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    return null;
  }
}

export function saveConversation(conversation: Conversation): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CONVERSATION_STORAGE_KEY,
    JSON.stringify(conversation),
  );
}

export function clearStoredConversation(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
}