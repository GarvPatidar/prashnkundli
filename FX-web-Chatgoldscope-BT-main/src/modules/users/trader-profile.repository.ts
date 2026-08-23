import type {
  ExperienceLevel,
  RiskTolerance,
  TradingStyle,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../prisma.js";

export interface UpdateTraderProfileInput {
  experienceLevel: ExperienceLevel;
  tradingStyle: TradingStyle;
  accountSize: string;
  mainChallenge: string;
  preferredTimeframe: string;
  riskTolerance: RiskTolerance;
  timezone?: string | null | undefined;
  country?: string | null | undefined;
}

export class TraderProfileRepository {
  async findByUserId(userId: string) {
    return prisma.traderProfile.findUnique({
      where: {
        userId,
      },
    });
  }

  async update(
    userId: string,
    input: UpdateTraderProfileInput,
  ) {
    return prisma.traderProfile.upsert({
      where: {
        userId,
      },

      create: {
        userId,
        experienceLevel: input.experienceLevel,
        tradingStyle: input.tradingStyle,
        accountSize: input.accountSize,
        mainChallenge: input.mainChallenge,
        preferredTimeframe:
          input.preferredTimeframe,
        riskTolerance: input.riskTolerance,
        timezone: input.timezone ?? null,
        country: input.country ?? null,
        onboardingCompleted: true,
      },

      update: {
        experienceLevel: input.experienceLevel,
        tradingStyle: input.tradingStyle,
        accountSize: input.accountSize,
        mainChallenge: input.mainChallenge,
        preferredTimeframe:
          input.preferredTimeframe,
        riskTolerance: input.riskTolerance,
        timezone: input.timezone ?? null,
        country: input.country ?? null,
        onboardingCompleted: true,
      },
    });
  }
}

export const traderProfileRepository =
  new TraderProfileRepository();