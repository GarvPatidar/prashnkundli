import type {
  ExperienceLevel,
  RiskTolerance,
  TradingStyle,
} from "../../generated/prisma/enums.js";
import {
  traderProfileRepository,
  type UpdateTraderProfileInput,
} from "./trader-profile.repository.js";

export interface SaveTraderProfileInput {
  userId: string;
  experienceLevel: ExperienceLevel;
  tradingStyle: TradingStyle;
  accountSize: string;
  mainChallenge: string;
  preferredTimeframe: string;
  riskTolerance: RiskTolerance;
  timezone?: string | null | undefined;
  country?: string | null | undefined;
}

export class TraderProfileServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_ACCOUNT_SIZE"
      | "INVALID_MAIN_CHALLENGE"
      | "INVALID_TIMEFRAME",
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "TraderProfileServiceError";
  }
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
  minimumLength: number,
  maximumLength: number,
): string {
  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (
    normalizedValue.length < minimumLength ||
    normalizedValue.length > maximumLength
  ) {
    const errorCode =
      fieldName === "accountSize"
        ? "INVALID_ACCOUNT_SIZE"
        : fieldName === "mainChallenge"
          ? "INVALID_MAIN_CHALLENGE"
          : "INVALID_TIMEFRAME";

    throw new TraderProfileServiceError(
      `${fieldName} is invalid.`,
      errorCode,
      400,
    );
  }

  return normalizedValue;
}

export class TraderProfileService {
  async saveProfile(
    input: SaveTraderProfileInput,
  ) {
    const repositoryInput: UpdateTraderProfileInput = {
      experienceLevel: input.experienceLevel,
      tradingStyle: input.tradingStyle,
      accountSize: normalizeRequiredText(
        input.accountSize,
        "accountSize",
        1,
        50,
      ),
      mainChallenge: normalizeRequiredText(
        input.mainChallenge,
        "mainChallenge",
        2,
        500,
      ),
      preferredTimeframe: normalizeRequiredText(
        input.preferredTimeframe,
        "preferredTimeframe",
        1,
        20,
      ),
      riskTolerance: input.riskTolerance,
      timezone: input.timezone?.trim() || null,
      country: input.country?.trim() || null,
    };

    return traderProfileRepository.update(
      input.userId,
      repositoryInput,
    );
  }

  async getProfile(userId: string) {
    return traderProfileRepository.findByUserId(userId);
  }
}

export const traderProfileService =
  new TraderProfileService();