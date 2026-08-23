export type CommunicationMode =
  | "MARKET_ANALYSIS"
  | "POSITION_REVIEW"
  | "RISK_WARNING"
  | "EDUCATION"
  | "CASUAL";

  export type ResponseMode =
  | "CONVERSATIONAL"
  | "ANALYSIS";
  
export type CommunicationTone =
  | "SIMPLE"
  | "BALANCED"
  | "PROFESSIONAL";

export type DecisionState =
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

export interface CommunicationProfile {
  mode: CommunicationMode;

  tone: CommunicationTone;

  decisionState: DecisionState;

  allowTechnicalTerms: boolean;

  prioritizeCapitalProtection: boolean;

  acknowledgeUserEmotion: boolean;
}

export interface UserFacingAnalysis {
  headline: string;

  decision: DecisionState;

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