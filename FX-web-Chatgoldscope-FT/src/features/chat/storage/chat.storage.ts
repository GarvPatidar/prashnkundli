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

export const ALL_CONVERSATIONS_KEY = "goldscope_all_conversations";
export function loadConversationById(id: string): Conversation | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ALL_CONVERSATIONS_KEY);
  if (!raw) return null;
  try {
    const list = JSON.parse(raw) as Conversation[];
    const matched = list.find(
      (c) => c.id === id || c.backendConversationId === id
    );
    if (matched) return matched;
    return list[0] || null;
  } catch {
    return null;
  }
}

export function saveConversationList(conversation: Conversation): void {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(ALL_CONVERSATIONS_KEY);
  const list: Conversation[] = raw ? JSON.parse(raw) : [];
  
  const index = list.findIndex((c) => c.id === conversation.id);
  if (index >= 0) {
    list[index] = conversation;
  } else {
    list.unshift(conversation);
  }
  
  window.localStorage.setItem(ALL_CONVERSATIONS_KEY, JSON.stringify(list));
}