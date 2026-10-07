import type {
  ChatRequest,
  TraderProfileContext,
} from "../../types.js";

import type {
  ConfluenceResult,
} from "../analysis/confluence.service.js";

import type {
  RiskAssessmentResult,
} from "../risk/risk.types.js";

import type {
  CommunicationMode,
  CommunicationProfile,
  CommunicationTone,
  DecisionState,
} from "./communication.types.js";

const CASUAL_EXACT_PATTERNS = [
  "hello",
  "hi",
  "hii",
  "hiii",
  "hey",
  "hey there",
  "good morning",
  "good afternoon",
  "good evening",
  "good night",
  "how are you",
  "who are you",
  "what are you",
  "what can you do",
  "thanks",
  "thank you",
  "thankyou",
  "ok",
  "okay",
] as const;

const EDUCATION_PATTERNS = [
  "why",
  "explain",
  "samjha",
  "samjhao",
  "samjhao na",
  "samjha do",
  "kaise",
  "how does",
  "what does",
  "meaning",
  "matlab",
] as const;

const POSITION_PATTERNS = [
  "my trade",
  "my position",
  "open trade",
  "open position",
  "current trade",
  "current position",

  "i bought",
  "i buy",
  "i sold",
  "i sell",
  "i entered",
  "i have a buy",
  "i have a sell",

  "maine buy",
  "maine sell",
  "buy liya",
  "sell liya",
  "buy le liya",
  "sell le liya",
  "trade le liya",
  "position le liya",

  "entry",
  "entry price",
  "stop loss",
  "stoploss",
  "sl kya",
  "sl kaha",
  "sl kitna",
  "tp kya",
  "tp kaha",
  "tp kitna",
  "take profit",

  "hold karu",
  "hold karun",
  "hold kru",
  "hold kru kya",

  "cut karu",
  "cut karun",
  "cut kru",
  "exit karu",
  "exit karun",
  "close karu",
  "close karun",

  "book profit",
  "profit book",
  "partial book",
  "partial close",

  "loss me",
  "loss mein",
  "loss mai",
  "in loss",
  "losing trade",
  "trade loss",
  "position loss",

  "profit me",
  "profit mein",
  "profit mai",
  "in profit",

  "breakeven",
  "break even",
  "move sl",
  "trail sl",
  "trailing stop",

  "lot size",
  "position size",
] as const;

const POSITION_CONTEXT_TERMS = [
  "buy",
  "sell",
  "trade",
  "position",
  "entry",
  "sl",
  "stop loss",
  "stoploss",
  "tp",
  "take profit",
  "loss",
  "profit",
  "hold",
  "exit",
  "close",
  "cut",
] as const;

const POSITION_ACTION_TERMS = [
  "kya karu",
  "kya karun",
  "kya kru",
  "what should i do",
  "should i",
  "hold",
  "exit",
  "close",
  "cut",
  "book",
  "move",
  "trail",
  "rakhu",
  "rakhun",
  "rakhna",
] as const;

function normalizeMessage(
  message: string,
): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/[?!.,:;()[\]{}"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  message: string,
  patterns: readonly string[],
): boolean {
  return patterns.some(
    (pattern) =>
      message.includes(pattern),
  );
}

function isCasualMessage(
  message: string,
): boolean {
  return CASUAL_EXACT_PATTERNS.some(
    (pattern) =>
      message === pattern ||
      message.startsWith(
        `${pattern} `,
      ),
  );
}

function isPositionReviewMessage(
  message: string,
): boolean {
  if (
    containsAny(
      message,
      POSITION_PATTERNS,
    )
  ) {
    return true;
  }

  /*
   * Catch natural follow-up wording such as:
   *
   * "sell me hu kya karu"
   * "trade 200 dollar loss me hai"
   * "buy hold karu?"
   *
   * We require both position context and
   * action/management intent so ordinary
   * market questions are not misclassified.
   */
  const hasPositionContext =
    containsAny(
      message,
      POSITION_CONTEXT_TERMS,
    );

  const hasManagementIntent =
    containsAny(
      message,
      POSITION_ACTION_TERMS,
    );

  return (
    hasPositionContext &&
    hasManagementIntent
  );
}

/*
 * A trade-idea request asks for a NEW setup (entry, stop loss,
 * targets, "should I buy now") and does not describe a trade the
 * trader already has. These must not be routed to POSITION_REVIEW,
 * otherwise the reply is built from the position fields and the
 * trade plan is never shown.
 */
const TRADE_IDEA_PATTERNS = [
  "trade idea",
  "trade setup",
  "give me a trade",
  "give me a setup",
  "any setup",
  "entry and stop",
  "entry stop",
  "entry sl",
  "entry point",
  "stop loss",
  "stoploss",
  "targets",
  "take profit",
  "sl and tp",
  "sl tp",
  "should i buy",
  "should i sell",
  "buy now",
  "sell now",
  "buy or sell",
  "long or short",
  "buy karu",
  "buy karun",
  "buy kru",
  "sell karu",
  "sell karun",
  "sell kru",
  "kya lena",
  "entry batao",
  "setup batao",
] as const;

const EXISTING_POSITION_PHRASES = [
  "my trade",
  "my position",
  "my buy",
  "my sell",
  "my sl",
  "my tp",
  "my stop",
  "i bought",
  "i sold",
  "i have",
  "i am in",
  "i entered",
  "open trade",
  "open position",
  "current trade",
  "current position",
  "break even",
  "move sl",
] as const;

const EXISTING_POSITION_WORDS =
  /\b(already|maine|mera|meri|loss|profit|hold|exit|close|cut|breakeven|trail|trailing|partial)\b/;

export function isTradeIdeaRequest(
  rawMessage: string,
): boolean {
  const message =
    normalizeMessage(
      rawMessage,
    );

  /*
   * "stop loss" and "take profit" are trade-plan vocabulary, not
   * evidence of an open trade, so remove them before looking for
   * existing-position wording ("loss", "profit").
   */
  const withoutLevelTerms =
    message.replace(
      /\b(stop loss|stoploss|take profit)\b/g,
      " ",
    );

  if (
    containsAny(
      withoutLevelTerms,
      EXISTING_POSITION_PHRASES,
    ) ||
    EXISTING_POSITION_WORDS.test(
      withoutLevelTerms,
    )
  ) {
    return false;
  }

  return containsAny(
    message,
    TRADE_IDEA_PATTERNS,
  );
}

function isEducationMessage(
  message: string,
): boolean {
  return containsAny(
    message,
    EDUCATION_PATTERNS,
  );
}

export function determineCommunicationMode(
  request: ChatRequest,
): CommunicationMode {
  /*
   * Explicit structured position supplied by
   * the frontend always takes priority.
   */
  if (request.position) {
    return "POSITION_REVIEW";
  }

  /*
   * A request for a new trade idea (no position described, no
   * screenshot) is a market question, not a position review.
   */
  if (
    !request.attachment &&
    isTradeIdeaRequest(
      request.message,
    )
  ) {
    return "MARKET_ANALYSIS";
  }

  const message =
    normalizeMessage(
      request.message,
    );

  /*
   * Intent priority matters.
   *
   * Position management is checked before
   * EDUCATION because questions such as:
   *
   * "why is my sell trade in loss?"
   *
   * are primarily about an existing position,
   * even though they contain "why".
   */
  /*
   * GoldScope has no trading-account connection, so a
   * position-style question without a supplied position or a
   * screenshot cannot be reviewed as a position. It is answered
   * as a normal market question instead.
   */
  if (
    request.attachment &&
    isPositionReviewMessage(
      message,
    )
  ) {
    return "POSITION_REVIEW";
  }

  if (
    !request.attachment &&
    isPositionReviewMessage(
      message,
    )
  ) {
    return "MARKET_ANALYSIS";
  }

  if (
    isCasualMessage(
      message,
    )
  ) {
    return "CASUAL";
  }

  if (
    isEducationMessage(
      message,
    )
  ) {
    return "EDUCATION";
  }

  /*
   * If it contains trading/market related terms, it is a MARKET_ANALYSIS query.
   * Otherwise, route it as a CASUAL general chat query so it goes to OpenAI dynamically.
   */
  const tradingKeywords = [
    "gold", "xau", "usd", "xauusd", "trade", "trading", "market", "price", "chart",
    "trend", "buy", "sell", "long", "short", "bull", "bear", "forecast", "signal",
    "level", "support", "resistance", "indicator", "candle", "analysis", "analyse", "analyze",
    "outlook", "technical", "fundamental", "liquidity", "volatility",
    "sona", "sone", "bhav", "rate", "niche", "upar", "uppar", "laya", "liya"
  ];

  const hasTradingKeywords = tradingKeywords.some((keyword) =>
    message.includes(keyword),
  );

  if (hasTradingKeywords) {
    return "MARKET_ANALYSIS";
  }

  return "CASUAL";
}


function determineTone(
  traderProfile:
    | TraderProfileContext
    | null,
): CommunicationTone {
  switch (
    traderProfile?.experienceLevel
  ) {
    case "BEGINNER":
      return "SIMPLE";

    case "ADVANCED":
      return "PROFESSIONAL";

    case "INTERMEDIATE":
    case null:
    default:
      return "BALANCED";
  }
}

function determineDecisionState(
  confluence:
    ConfluenceResult,

  risk:
    RiskAssessmentResult,
): DecisionState {
  if (
    risk.tradeEnvironment ===
    "AVOID"
  ) {
    return "AVOID";
  }

  switch (
    confluence.finalBias
  ) {
    case "STRONG_BULLISH":
      return "STRONG_BULLISH";

    case "BULLISH":
    case "CAUTIOUS_BULLISH":
      return "BULLISH";

    case "STRONG_BEARISH":
      return "STRONG_BEARISH";

    case "BEARISH":
    case "CAUTIOUS_BEARISH":
      return "BEARISH";

    case "NEUTRAL":
      return "WAIT";
  }
}

function shouldAcknowledgeEmotion(
  message: string,
): boolean {
  const normalized =
    normalizeMessage(
      message,
    );

  const emotionalTerms = [
    "loss",
    "lost",
    "dar",
    "darr",
    "scared",
    "confused",
    "confusion",
    "stuck",
    "recover",
    "recovery",
    "frustrated",
    "panic",
    "tension",
    "worried",
    "worry",
    "nervous",
    "fomo",
  ] as const;

  return containsAny(
    normalized,
    emotionalTerms,
  );
}

export class CommunicationService {
  createProfile(
    input: {
      request:
        ChatRequest;

      traderProfile:
        | TraderProfileContext
        | null;

      confluence:
        ConfluenceResult;

      risk:
        RiskAssessmentResult;
    },
  ): CommunicationProfile {
    const mode =
      determineCommunicationMode(
        input.request,
      );

    return {
      mode,

      tone:
        determineTone(
          input.traderProfile,
        ),

      decisionState:
        determineDecisionState(
          input.confluence,
          input.risk,
        ),

      allowTechnicalTerms:
        input.traderProfile
          ?.experienceLevel ===
        "ADVANCED",

      prioritizeCapitalProtection:
        input.risk.overallRisk ===
          "HIGH" ||
        input.risk.overallRisk ===
          "EXTREME",

      acknowledgeUserEmotion:
        shouldAcknowledgeEmotion(
          input.request.message,
        ),
    };
  }
}

export const communicationService =
  new CommunicationService();