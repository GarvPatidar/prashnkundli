export type ChatRole =
  | "user"
  | "assistant"
  | "system";

export type MessageStatus =
  | "sending"
  | "sent"
  | "streaming"
  | "completed"
  | "failed";

export type AttachmentType =
  "image";

export type ResponseMode =
  | "CONVERSATIONAL"
  | "ANALYSIS";

export type MarketDecision =
  | "STRONG_BULLISH"
  | "BULLISH"
  | "WAIT"
  | "BEARISH"
  | "STRONG_BEARISH"
  | "AVOID";

export type TradeAction =
  | "BUY_SETUP"
  | "SELL_SETUP"
  | "WAIT"
  | "AVOID";

export interface GoldScopeAnalysis {
  headline: string;

  decision: MarketDecision;

  action: TradeAction;

  confidence: number | null;

  summary: string;

  whatMarketIsShowing: string;

  primaryRisk: string;

  whatWouldStrengthenTheSetup: string;

  whatWouldWeakenTheSetup: string;

  nextStep: string;

  traderNote: string | null;

  disclaimer: string;
}

export interface ChatAttachment {
  id: string;

  type: AttachmentType;

  fileName: string;

  previewUrl: string;

  mimeType: string;

  size: number;
}

export interface MarketContext {
  symbol: "XAUUSD";

  price?: number;

  bid?: number | null;

  ask?: number | null;

  spread?: number | null;

  session: string;

  provider: string;

  timestamp: string;
}

export interface AnalysisSection {
  title: string;

  content: string;

  tone?:
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger";
}

export interface ChatMessage {
  id: string;

  conversationId: string;

  role: ChatRole;

  content: string;

  status: MessageStatus;

  attachments: ChatAttachment[];

  responseMode?:
    ResponseMode;

  analysis?:
    GoldScopeAnalysis;

  marketContext?:
    MarketContext;

  analysisSections?:
    AnalysisSection[];

  createdAt: string;
}

export interface Conversation {
  id: string;

  backendConversationId?:
    | string
    | null;

  title: string;

  messages: ChatMessage[];

  createdAt: string;

  updatedAt: string;
}