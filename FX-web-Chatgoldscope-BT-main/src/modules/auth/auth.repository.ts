import type { OtpPurpose } from "../../generated/prisma/enums.js";
import { prisma } from "../../prisma.js";

export interface CreateUserInput {
  fullName: string;
  phone: string;
  countryCode: string;
  email: string | null;
  passwordHash: string;
  whatsappConsent: boolean;
}

export interface CreateOtpInput {
  userId: string;
  phone: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  maxAttempts?: number;
}

export class AuthRepository {
  async findUserByPhone(phone: string) {
    return prisma.user.findUnique({
      where: {
        phone,
      },
      include: {
        profile: true,
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        profile: true,
      },
    });
  }

  async findUserById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: true,
      },
    });
  }

async createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      fullName: input.fullName,
      phone: input.phone,
      countryCode: input.countryCode,
      email: input.email,
      passwordHash: input.passwordHash,
      whatsappConsent: input.whatsappConsent,
      status: "PENDING_VERIFICATION",

      profile: {
        create: {
          onboardingCompleted: false,
        },
      },
    },

    include: {
      profile: true,
    },
  });
}
  async activateUser(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        status: "ACTIVE",
        phoneVerifiedAt: new Date(),
      },

      include: {
        profile: true,
      },
    });
  }

  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        lastLoginAt: new Date(),
      },
    });
  }

async updatePasswordHash(
  userId: string,
  passwordHash: string,
) {
  return prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      passwordHash,
    },

    include: {
      profile: true,
    },
  });
}

async revokeActivePasswordResetOtps(
  phone: string,
): Promise<void> {
  await prisma.otpCode.updateMany({
    where: {
      phone,
      purpose: "FORGOT_PASSWORD",
      consumedAt: null,
    },

    data: {
      consumedAt: new Date(),
    },
  });
}

  async invalidateActiveOtpCodes(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    await prisma.otpCode.updateMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },

      data: {
        consumedAt: new Date(),
      },
    });
  }

  async createOtp(input: CreateOtpInput) {
    return prisma.otpCode.create({
      data: {
        userId: input.userId,
        phone: input.phone,
        purpose: input.purpose,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        maxAttempts: input.maxAttempts ?? 5,
      },
    });
  }

  async findLatestActiveOtp(
    phone: string,
    purpose: OtpPurpose,
  ) {
    return prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async incrementOtpAttempts(otpId: string) {
    return prisma.otpCode.update({
      where: {
        id: otpId,
      },

      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async consumeOtp(otpId: string) {
    return prisma.otpCode.update({
      where: {
        id: otpId,
      },

      data: {
        consumedAt: new Date(),
      },
    });
  }
}

export const authRepository = new AuthRepository();