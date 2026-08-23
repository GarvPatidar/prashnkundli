import { prisma } from "../../prisma.js";

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}

export class SessionRepository {
  async create(
    input: CreateSessionInput,
  ) {
    return prisma.userSession.create({
      data: {
        userId:
          input.userId,

        refreshTokenHash:
          input.refreshTokenHash,

        userAgent:
          input.userAgent ??
          null,

        ipAddress:
          input.ipAddress ??
          null,

        expiresAt:
          input.expiresAt,
      },
    });
  }

  async findById(
    sessionId: string,
  ) {
    return prisma.userSession.findUnique({
      where: {
        id:
          sessionId,
      },

      include: {
        user: {
          include: {
            profile:
              true,
          },
        },
      },
    });
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ) {
    return prisma.userSession.findUnique({
      where: {
        refreshTokenHash,
      },

      include: {
        user: {
          include: {
            profile:
              true,
          },
        },
      },
    });
  }

  async updateRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ) {
    return prisma.userSession.update({
      where: {
        id:
          sessionId,
      },

      data: {
        refreshTokenHash,

        expiresAt,

        lastUsedAt:
          new Date(),
      },
    });
  }

  async touchIfOlderThan(
    sessionId: string,
    threshold: Date,
  ): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        id:
          sessionId,

        revokedAt:
          null,

        lastUsedAt: {
          lt:
            threshold,
        },
      },

      data: {
        lastUsedAt:
          new Date(),
      },
    });
  }

  async revoke(
    sessionId: string,
  ) {
    return prisma.userSession.update({
      where: {
        id:
          sessionId,
      },

      data: {
        revokedAt:
          new Date(),
      },
    });
  }

  async revokeAllForUser(
    userId: string,
  ) {
    return prisma.userSession.updateMany({
      where: {
        userId,

        revokedAt:
          null,
      },

      data: {
        revokedAt:
          new Date(),
      },
    });
  }

  async deleteExpired() {
    return prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt:
            new Date(),
        },
      },
    });
  }
}

export const sessionRepository =
  new SessionRepository();