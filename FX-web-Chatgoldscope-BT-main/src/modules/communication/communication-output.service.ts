import type {
  AnalysisResult,
} from "../../types.js";

import type {
  CommunicationProfile,
  DecisionState,
  TradeAction,
  UserFacingAnalysis,
} from "./communication.types.js";

import {
  inspectCommunicationOutput,
} from "./communication.guard.js";

import {
  userFacingAnalysisSchema,
} from "./communication.schema.js";

export type CommunicationOutputErrorCode =
  | "INVALID_AI_OUTPUT"
  | "COMMUNICATION_POLICY_VIOLATION"
  | "DECISION_ALIGNMENT_FAILED";

export class CommunicationOutputError
  extends Error {
  constructor(
    message: string,
    public readonly code:
      CommunicationOutputErrorCode,
    public readonly metadata?: unknown,
  ) {
    super(message);

    this.name =
      "CommunicationOutputError";
  }
}

export interface FinalizeCommunicationInput {
  analysis: AnalysisResult;

  communication:
    CommunicationProfile;
}

/*
 * Bias alone must never be treated as an
 * immediate execution instruction.
 *
 * Directional confidence needs to reach this
 * threshold before the response can surface
 * a directional setup action.
 */
const DIRECTIONAL_SETUP_CONFIDENCE_THRESHOLD =
  55;

const BULLISH_TERMS = [
  "bullish",
  "buyers have control",
  "buyers are stronger",
  "buyers have the stronger hand",
  "buyer pressure",
  "buy-side",
] as const;

const BEARISH_TERMS = [
  "bearish",
  "sellers have control",
  "sellers are stronger",
  "sellers have the stronger hand",
  "seller pressure",
  "sell-side",
] as const;

function normalizeText(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  value: string,
  terms: readonly string[],
): boolean {
  const normalized =
    normalizeText(value);

  return terms.some((term) =>
    normalized.includes(
      normalizeText(term),
    ),
  );
}

/*
 * decisionState = directional market bias
 *
 * action = what should be considered right now
 *
 * Example:
 *
 * decision = BULLISH
 * action   = WAIT
 *
 * means buyers currently have the directional
 * advantage, but execution quality is not yet
 * strong enough.
 */
function getTradeAction(
  decisionState: DecisionState,
  confidence: number | null,
): TradeAction {
  switch (decisionState) {
    case "AVOID":
      return "AVOID";

    case "WAIT":
      return "WAIT";

    case "STRONG_BULLISH":
    case "BULLISH":
      return (
        (confidence ?? 0) >=
        DIRECTIONAL_SETUP_CONFIDENCE_THRESHOLD
      )
        ? "BUY_SETUP"
        : "WAIT";

    case "STRONG_BEARISH":
    case "BEARISH":
      return (
        (confidence ?? 0) >=
        DIRECTIONAL_SETUP_CONFIDENCE_THRESHOLD
      )
        ? "SELL_SETUP"
        : "WAIT";
  }
}
function getHeadline(
  decisionState: DecisionState,
  action: TradeAction,
): string {
  if (action === "AVOID") {
    return "Current conditions do not justify fresh risk";
  }

  if (action === "WAIT") {
    switch (decisionState) {
      case "STRONG_BULLISH":
      case "BULLISH":
        return "Bullish bias, but confirmation is still needed";

      case "STRONG_BEARISH":
      case "BEARISH":
        return "Bearish bias, but confirmation is still needed";

      case "WAIT":
        return "The better decision right now is to wait";

      case "AVOID":
        return "Current conditions do not justify fresh risk";
    }
  }

  if (action === "BUY_SETUP") {
    return decisionState === "STRONG_BULLISH"
      ? "Buyers currently have the stronger hand"
      : "The market currently leans bullish";
  }

  return decisionState === "STRONG_BEARISH"
    ? "Sellers currently have the stronger hand"
    : "The market currently leans bearish";
}

/*
 * Detect only genuine directional contradictions.
 *
 * WAIT language is NOT a contradiction to a bullish
 * or bearish bias because:
 *
 * bias = BULLISH
 * action = WAIT
 *
 * is a valid institutional-style state.
 */
function analysisContradictsDecision(
  analysis: AnalysisResult,
  decisionState: DecisionState,
): boolean {
  const combinedText = [
    analysis.marketCondition,
    analysis.mainRisk,
    analysis.positionStatus,
    analysis.nextStep,
  ].join(" ");

  const mentionsBullish =
    containsAny(
      combinedText,
      BULLISH_TERMS,
    );

  const mentionsBearish =
    containsAny(
      combinedText,
      BEARISH_TERMS,
    );

  switch (decisionState) {
    case "STRONG_BULLISH":
    case "BULLISH":
      return (
        mentionsBearish &&
        !mentionsBullish
      );

    case "STRONG_BEARISH":
    case "BEARISH":
      return (
        mentionsBullish &&
        !mentionsBearish
      );

    case "WAIT":
    case "AVOID":
      return false;
  }
}

function buildAlignedSummary(
  analysis: AnalysisResult,
  decisionState: DecisionState,
  action: TradeAction,
): string {
  if (action === "AVOID") {
    return (
      "Current risk conditions do not justify taking fresh exposure. " +
      analysis.marketCondition
    );
  }

  if (action === "WAIT") {
    switch (decisionState) {
      case "STRONG_BULLISH":
      case "BULLISH":
        return (
          "The market currently has a bullish bias, but confirmation is not strong enough for immediate execution. " +
          analysis.marketCondition
        );

      case "STRONG_BEARISH":
      case "BEARISH":
        return (
          "The market currently has a bearish bias, but confirmation is not strong enough for immediate execution. " +
          analysis.marketCondition
        );

      case "WAIT":
        return (
          "Current evidence is not aligned enough to justify forcing a directional trade. " +
          analysis.marketCondition
        );

      case "AVOID":
        return (
          "Current risk conditions do not justify taking fresh exposure. " +
          analysis.marketCondition
        );
    }
  }

  switch (decisionState) {
    case "STRONG_BULLISH":
      return (
        "The current market picture strongly favors buyers. " +
        analysis.marketCondition
      );

    case "BULLISH":
      return (
        "The current market picture leans bullish. " +
        analysis.marketCondition
      );

    case "STRONG_BEARISH":
      return (
        "The current market picture strongly favors sellers. " +
        analysis.marketCondition
      );

    case "BEARISH":
      return (
        "The current market picture leans bearish. " +
        analysis.marketCondition
      );

    case "WAIT":
      return (
        "Current evidence is not aligned enough to justify forcing a directional trade. " +
        analysis.marketCondition
      );

    case "AVOID":
      return (
        "Current risk conditions do not justify taking fresh exposure. " +
        analysis.marketCondition
      );
  }
}

function getStrengtheningScenario(
  analysis: AnalysisResult,
  decisionState: DecisionState,
): string {
  switch (decisionState) {
    case "STRONG_BULLISH":
    case "BULLISH":
      return analysis.bullishScenario;

    case "STRONG_BEARISH":
    case "BEARISH":
      return analysis.bearishScenario;

    case "WAIT":
    case "AVOID":
      return (
        `Bullish confirmation: ${analysis.bullishScenario} ` +
        `Bearish confirmation: ${analysis.bearishScenario}`
      );
  }
}

function getWeakeningScenario(
  analysis: AnalysisResult,
  decisionState: DecisionState,
): string {
  switch (decisionState) {
    case "STRONG_BULLISH":
    case "BULLISH":
      return analysis.bearishScenario;

    case "STRONG_BEARISH":
    case "BEARISH":
      return analysis.bullishScenario;

    case "WAIT":
    case "AVOID":
      return analysis.mainRisk;
  }
}

function buildAlignedNextStep(
  analysis: AnalysisResult,
  decisionState: DecisionState,
  action: TradeAction,
): string {
  switch (action) {
    case "BUY_SETUP":
      return (
        "The bullish side currently has enough supporting evidence to focus on a buy-side setup, but entry still requires confirmation and predefined risk. " +
        analysis.nextStep
      );

    case "SELL_SETUP":
      return (
        "The bearish side currently has enough supporting evidence to focus on a sell-side setup, but entry still requires confirmation and predefined risk. " +
        analysis.nextStep
      );

    case "WAIT":
      switch (decisionState) {
        case "STRONG_BULLISH":
        case "BULLISH":
          return (
            "Keep the bullish bias, but do not enter until confirmation improves. " +
            analysis.nextStep
          );

        case "STRONG_BEARISH":
        case "BEARISH":
          return (
            "Keep the bearish bias, but do not enter until confirmation improves. " +
            analysis.nextStep
          );

        case "WAIT":
          return (
            "Do not force an entry while the evidence remains mixed. " +
            analysis.nextStep
          );

        case "AVOID":
          return (
            "Avoid fresh exposure until the risk environment improves. " +
            analysis.nextStep
          );
      }

    case "AVOID":
      return (
        "Avoid fresh exposure until the risk environment improves. " +
        analysis.nextStep
      );
  }
}

function mapAnalysis(
  input: FinalizeCommunicationInput,
): UserFacingAnalysis {
  const decisionState =
    input.communication
      .decisionState;

  const action =
    getTradeAction(
      decisionState,
      input.analysis.confidence,
    );

  const contradictsDecision =
    analysisContradictsDecision(
      input.analysis,
      decisionState,
    );

  /*
   * We align presentation whenever:
   *
   * 1. AI text direction contradicts engine bias, or
   * 2. execution action is WAIT/AVOID.
   *
   * This guarantees that a bullish market bias with
   * low confidence cannot accidentally read like an
   * immediate BUY instruction.
   */
  const requiresAlignment =
    contradictsDecision ||
    action === "WAIT" ||
    action === "AVOID";

  const summary =
    requiresAlignment
      ? buildAlignedSummary(
          input.analysis,
          decisionState,
          action,
        )
      : input.analysis
          .marketCondition;

  const nextStep =
    requiresAlignment
      ? buildAlignedNextStep(
          input.analysis,
          decisionState,
          action,
        )
      : input.analysis
          .nextStep;

  return {
    headline:
      getHeadline(
        decisionState,
        action,
      ),

    /*
     * Directional market bias.
     */
    decision:
      decisionState,

    /*
     * Execution state right now.
     */
    action,

    confidence:
      input.analysis.confidence,

    summary,

    whatMarketIsShowing:
      summary,

    primaryRisk:
      input.analysis.mainRisk,

    whatWouldStrengthenTheSetup:
      getStrengtheningScenario(
        input.analysis,
        decisionState,
      ),

    whatWouldWeakenTheSetup:
      getWeakeningScenario(
        input.analysis,
        decisionState,
      ),

    nextStep,

    traderNote:
      input.analysis
        .positionStatus,

    disclaimer:
      input.analysis.disclaimer,
  };
}

export class CommunicationOutputService {
  finalize(
    input: FinalizeCommunicationInput,
  ): UserFacingAnalysis {
    const mappedOutput =
      mapAnalysis(
        input,
      );

    const validation =
      userFacingAnalysisSchema.safeParse(
        mappedOutput,
      );

    if (!validation.success) {
      throw new CommunicationOutputError(
        "AI output could not be converted into the required user-facing response.",
        "INVALID_AI_OUTPUT",
        validation.error.flatten(),
      );
    }

    const guardResult =
      inspectCommunicationOutput(
        validation.data,
      );

    if (!guardResult.valid) {
      throw new CommunicationOutputError(
        "Generated response violated the communication policy.",
        "COMMUNICATION_POLICY_VIOLATION",
        {
          violations:
            guardResult.violations,
        },
      );
    }

    return validation.data;
  }
}

export const communicationOutputService =
  new CommunicationOutputService();