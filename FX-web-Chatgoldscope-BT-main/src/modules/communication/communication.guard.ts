import {
  INTERNAL_INDICATOR_TERMS,
  PROTECTED_INTERNAL_TERMS,
} from "./communication.policy.js";

import type {
  UserFacingAnalysis,
} from "./communication.types.js";

export type CommunicationViolationCode =
  | "PROTECTED_INTERNAL_TERM"
  | "RAW_INDICATOR_TERM"
  | "HUMAN_IMPERSONATION"
  | "GUARANTEED_OUTCOME"
  | "REVENGE_TRADING_LANGUAGE";

export interface CommunicationViolation {
  code: CommunicationViolationCode;
  term: string;
  field: string;
}

export interface CommunicationGuardResult {
  valid: boolean;
  violations: CommunicationViolation[];
}

const HUMAN_IMPERSONATION_TERMS = [
  "i am a human",
  "i'm human",
  "i trade personally",
  "my own trades",
  "when i was trading",
  "i have traded",
  "i've traded",
] as const;

const GUARANTEE_TERMS = [
  "guaranteed profit",
  "guaranteed win",
  "sure profit",
  "100% profit",
  "cannot lose",
  "can't lose",
  "risk free trade",
] as const;

const REVENGE_LANGUAGE_TERMS = [
  "double your lot",
  "double the lot",
  "recover it quickly",
  "recover your loss with",
  "go all in",
  "use full margin",
] as const;

function normalizeText(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function inspectTerms(
  field: string,
  content: string,
  terms: readonly string[],
  code: CommunicationViolationCode,
  violations: CommunicationViolation[],
): void {
  const normalized =
    normalizeText(content);

  for (const term of terms) {
    if (
      normalized.includes(
        term.toLowerCase(),
      )
    ) {
      violations.push({
        code,
        term,
        field,
      });
    }
  }
}

function getTextFields(
  analysis: UserFacingAnalysis,
): Array<
  [string, string]
> {
  return [
    ["headline", analysis.headline],
    ["summary", analysis.summary],
    [
      "whatMarketIsShowing",
      analysis.whatMarketIsShowing,
    ],
    [
      "primaryRisk",
      analysis.primaryRisk,
    ],
    [
      "whatWouldStrengthenTheSetup",
      analysis.whatWouldStrengthenTheSetup,
    ],
    [
      "whatWouldWeakenTheSetup",
      analysis.whatWouldWeakenTheSetup,
    ],
    ["nextStep", analysis.nextStep],
    [
      "traderNote",
      analysis.traderNote ?? "",
    ],
    [
      "disclaimer",
      analysis.disclaimer,
    ],
  ];
}

export function inspectCommunicationOutput(
  analysis: UserFacingAnalysis,
): CommunicationGuardResult {
  const violations: CommunicationViolation[] =
    [];

  for (
    const [field, content] of
    getTextFields(analysis)
  ) {
    inspectTerms(
      field,
      content,
      PROTECTED_INTERNAL_TERMS,
      "PROTECTED_INTERNAL_TERM",
      violations,
    );

    inspectTerms(
      field,
      content,
      INTERNAL_INDICATOR_TERMS,
      "RAW_INDICATOR_TERM",
      violations,
    );

    inspectTerms(
      field,
      content,
      HUMAN_IMPERSONATION_TERMS,
      "HUMAN_IMPERSONATION",
      violations,
    );

    inspectTerms(
      field,
      content,
      GUARANTEE_TERMS,
      "GUARANTEED_OUTCOME",
      violations,
    );

    inspectTerms(
      field,
      content,
      REVENGE_LANGUAGE_TERMS,
      "REVENGE_TRADING_LANGUAGE",
      violations,
    );
  }

  return {
    valid:
      violations.length === 0,

    violations,
  };
}