import type {
  ChatRequest,
  TraderProfileContext,
} from "../../types.js";

import {
  CONFUSION_TERMS,
  FOMO_TERMS,
  LOSS_TERMS,
  REVENGE_TERMS,
} from "./personality.rules.js";

import type {
  EmotionalState,
  PersonalityContext,
  TraderPersonality,
} from "./personality.types.js";

export type PersonalityServiceErrorCode =
  | "INVALID_MESSAGE";

export class PersonalityServiceError extends Error {
  constructor(
    message: string,
    public readonly code: PersonalityServiceErrorCode,
  ) {
    super(message);
    this.name = "PersonalityServiceError";
  }
}

function normalizeText(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s$%.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAnyTerm(
  text: string,
  terms: readonly string[],
): boolean {
  return terms.some((term) =>
    text.includes(
      normalizeText(term),
    ),
  );
}

function countMatchedTerms(
  text: string,
  terms: readonly string[],
): number {
  return terms.reduce(
    (count, term) =>
      text.includes(
        normalizeText(term),
      )
        ? count + 1
        : count,
    0,
  );
}

function resolveTraderPersonality(
  traderProfile:
    | TraderProfileContext
    | null,
): TraderPersonality {
  switch (
    traderProfile?.experienceLevel
  ) {
    case "BEGINNER":
      return "BEGINNER";

    case "ADVANCED":
      return "ADVANCED";

    case "INTERMEDIATE":
    case null:
    default:
      return "INTERMEDIATE";
  }
}

function detectExplicitRevengeTrading(
  message: string,
): boolean {
  return containsAnyTerm(
    message,
    REVENGE_TERMS,
  );
}

function detectLossState(
  message: string,
): boolean {
  return containsAnyTerm(
    message,
    LOSS_TERMS,
  );
}

function detectConfusion(
  message: string,
): boolean {
  return containsAnyTerm(
    message,
    CONFUSION_TERMS,
  );
}

function detectAnxiety(
  message: string,
): boolean {
  const anxietyTerms = [
    "dar",
    "fear",
    "scared",
    "panic",
    "tension",
    "worried",
    "worry",
    "anxious",
    "anxiety",
    "ghabra",
    "nervous",
  ] as const;

  return containsAnyTerm(
    message,
    anxietyTerms,
  );
}

function detectOverconfidence(
  message: string,
): boolean {
  const overconfidenceTerms = [
    "sure shot",
    "sure-shot",
    "100 percent",
    "100%",
    "guaranteed",
    "guarantee",
    "pakka",
    "confirm profit",
    "can't lose",
    "cannot lose",
    "all in",
    "full margin",
  ] as const;

  return containsAnyTerm(
    message,
    overconfidenceTerms,
  );
}

function detectFomo(
  message: string,
): boolean {
  const fomoScore =
    countMatchedTerms(
      message,
      FOMO_TERMS,
    );

  const urgencyTerms = [
    "miss ho jayega",
    "miss ho jaega",
    "miss the move",
    "entry chhut",
    "entry miss",
    "abhi entry",
    "jaldi entry",
    "immediately enter",
  ] as const;

  return (
    fomoScore >= 2 ||
    containsAnyTerm(
      message,
      urgencyTerms,
    )
  );
}

function detectEmotionalState(
  normalizedMessage: string,
): EmotionalState {
  /*
   * Order matters.
   *
   * Revenge trading is treated as the highest-priority
   * emotional condition because it can materially
   * increase trading risk.
   */
  if (
    detectExplicitRevengeTrading(
      normalizedMessage,
    )
  ) {
    return "REVENGE_TRADING";
  }

  if (
    detectOverconfidence(
      normalizedMessage,
    )
  ) {
    return "OVERCONFIDENT";
  }

  if (
    detectLossState(
      normalizedMessage,
    )
  ) {
    return "LOSS";
  }

  if (
    detectAnxiety(
      normalizedMessage,
    )
  ) {
    return "ANXIOUS";
  }

  if (
    detectFomo(
      normalizedMessage,
    )
  ) {
    return "ANXIOUS";
  }

  if (
    detectConfusion(
      normalizedMessage,
    )
  ) {
    return "CONFUSED";
  }

  return "NORMAL";
}

function shouldUseSimpleLanguage(
  trader:
    TraderPersonality,
): boolean {
  return trader === "BEGINNER";
}

function shouldUseEducation(
  trader:
    TraderPersonality,
  emotion:
    EmotionalState,
): boolean {
  if (
    emotion === "REVENGE_TRADING" ||
    emotion === "OVERCONFIDENT"
  ) {
    return true;
  }

  return (
    trader === "BEGINNER" ||
    trader === "INTERMEDIATE"
  );
}

function shouldExplainRiskMore(
  trader:
    TraderPersonality,
  emotion:
    EmotionalState,
): boolean {
  if (
    emotion === "LOSS" ||
    emotion === "ANXIOUS" ||
    emotion === "REVENGE_TRADING" ||
    emotion === "OVERCONFIDENT"
  ) {
    return true;
  }

  return trader === "BEGINNER";
}

function shouldAvoidFomoLanguage(
  emotion:
    EmotionalState,
): boolean {
  return (
    emotion === "ANXIOUS" ||
    emotion === "LOSS" ||
    emotion === "REVENGE_TRADING" ||
    emotion === "OVERCONFIDENT"
  );
}

function shouldDiscourageRevengeTrading(
  emotion:
    EmotionalState,
): boolean {
  return (
    emotion === "REVENGE_TRADING" ||
    emotion === "LOSS"
  );
}

function shouldAcknowledgeEmotion(
  emotion:
    EmotionalState,
): boolean {
  return emotion !== "NORMAL";
}

export interface CreatePersonalityContextInput {
  request: ChatRequest;

  traderProfile:
    | TraderProfileContext
    | null;
}

export class PersonalityService {
  createContext(
    input: CreatePersonalityContextInput,
  ): PersonalityContext {
    const normalizedMessage =
      normalizeText(
        input.request.message,
      );

    if (!normalizedMessage) {
      throw new PersonalityServiceError(
        "User message is required to create personality context.",
        "INVALID_MESSAGE",
      );
    }

    const trader =
      resolveTraderPersonality(
        input.traderProfile,
      );

    const emotion =
      detectEmotionalState(
        normalizedMessage,
      );

    return {
      trader,
      emotion,

      useSimpleLanguage:
        shouldUseSimpleLanguage(
          trader,
        ),

      useEducation:
        shouldUseEducation(
          trader,
          emotion,
        ),

      explainRiskMore:
        shouldExplainRiskMore(
          trader,
          emotion,
        ),

      avoidFomoLanguage:
        shouldAvoidFomoLanguage(
          emotion,
        ),

      discourageRevengeTrading:
        shouldDiscourageRevengeTrading(
          emotion,
        ),
    };
  }

  shouldAcknowledgeEmotion(
    context: PersonalityContext,
  ): boolean {
    return shouldAcknowledgeEmotion(
      context.emotion,
    );
  }
}

export const personalityService =
  new PersonalityService();