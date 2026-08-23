export interface ChatRequest {
  message: string;

  conversationId?:
    | string
    | null
    | undefined;

  /*
   * Recent messages from the same conversation.
   *
   * This is prepared internally by ChatService.
   * The frontend does not need to send it.
   */
  conversationContext?:
    | ConversationContextMessage[]
    | undefined;

  position?:
    | Record<string, unknown>
    | null
    | undefined;

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
  | null
  | undefined;
}
export interface TraderProfileContext {
  experienceLevel:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | null;

  tradingStyle:
    | "SCALPING"
    | "INTRADAY"
    | "SWING"
    | null;

  accountSize: string | null;
  mainChallenge: string | null;
  preferredTimeframe: string | null;

  riskTolerance:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | null;

  timezone: string | null;
  country: string | null;
  onboardingCompleted: boolean;
}

export interface AnalysisResult {
  marketCondition: string;
  mainRisk: string;
  bullishScenario: string;
  bearishScenario: string;
  positionStatus: string;
  nextStep: string;
  confidence: number | null;
  disclaimer: string;
}

export interface MarketSnapshot {
  symbol: "XAUUSD";

  quote: {
  price: number;

  bid: number | null;
  ask: number | null;
  spread: number | null;

  provider: string;
  timestamp: string;
};

  session: {
    name: string;
    highLiquidity: boolean;
  };

  indicators: Record<string, unknown>;
  levels: Record<string, unknown>;
  generatedAt: string;
}

export interface CalendarContext {
  nextHighImpactEvent:
    | Record<string, unknown>
    | null;

  newsRiskWindow: boolean;
  generatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  status:
    | "streaming"
    | "completed"
    | "failed";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  symbol: "XAUUSD";
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export type ConversationContextRole =
  | "user"
  | "assistant";

export interface ConversationContextMessage {
  role: ConversationContextRole;

  content: string;
}