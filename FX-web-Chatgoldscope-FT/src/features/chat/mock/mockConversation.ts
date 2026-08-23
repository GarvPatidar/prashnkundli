import type { Conversation } from "../types";

export const mockConversation: Conversation = {
  id: "conversation_demo_001",

  title: "Current XAU/USD Analysis",

  createdAt: new Date().toISOString(),

  updatedAt: new Date().toISOString(),

  messages: [
    {
      id: "message_1",

      conversationId: "conversation_demo_001",

      role: "assistant",

      status: "completed",

      createdAt: new Date().toISOString(),

      content:
        "Hello 👋 I am GoldScope AI. I specialise only in XAU/USD. Tell me your trading situation or upload your TradingView chart.",

      attachments: [],
    },
  ],
};