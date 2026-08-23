import {
  createHash,
  randomBytes,
} from "node:crypto";

import { env } from "../../config.js";
import { jwtService } from "./jwt.service.js";
import { sessionRepository } from "./session.repository.js";

const REFRESH_TOKEN_PREFIX =
  "gs_rt_";

const REFRESH_TOKEN_BYTES =
  64;

const SESSION_INACTIVITY_LIMIT_MS =
  7 * 24 * 60 * 60 * 1_000;

export interface CreateAuthSessionInput {
  userId: string;

  userAgent?:
    | string
    | null
    | undefined;

  ipAddress?:
    | string
    | null
    | undefined;
}

export interface AuthSessionResult {
  accessToken: string;

  refreshToken: string;

  accessTokenExpiresIn: string;

  refreshTokenExpiresAt: string;

  session: {
    id: string;

    userId: string;

    createdAt: string;
  };
}

export interface RotateRefreshTokenResult {
  accessToken: string;

  refreshToken: string;

  accessTokenExpiresIn: string;

  refreshTokenExpiresAt: string;

  session: {
    id: string;

    userId: string;

    lastUsedAt: string;
  };
}

export type RefreshTokenServiceErrorCode =
  | "REFRESH_TOKEN_INVALID"
  | "REFRESH_TOKEN_EXPIRED"
  | "SESSION_REVOKED"
  | "SESSION_INACTIVE"
  | "USER_UNAVAILABLE"
  | "REFRESH_TOKEN_CONFIGURATION_ERROR";

export class RefreshTokenServiceError
  extends Error {
  constructor(
    message: string,

    public readonly code:
      RefreshTokenServiceErrorCode,

    public readonly statusCode:
      number,
  ) {
    super(message);

    this.name =
      "RefreshTokenServiceError";
  }
}

function generateRefreshToken():
  string {
  const tokenValue =
    randomBytes(
      REFRESH_TOKEN_BYTES,
    ).toString(
      "base64url",
    );

  return `${REFRESH_TOKEN_PREFIX}${tokenValue}`;
}

function hashRefreshToken(
  refreshToken: string,
): string {
  return createHash(
    "sha256",
  )
    .update(
      refreshToken,
    )
    .digest(
      "hex",
    );
}

function parseDurationToMilliseconds(
  duration: string,
): number {
  const normalizedDuration =
    duration
      .trim()
      .toLowerCase();

  const match =
    /^(\d+)(s|m|h|d)$/.exec(
      normalizedDuration,
    );

  if (!match) {
    throw new RefreshTokenServiceError(
      "REFRESH_TOKEN_EXPIRES_IN must use a format such as 30d, 12h, 30m or 60s.",
      "REFRESH_TOKEN_CONFIGURATION_ERROR",
      500,
    );
  }

  const value =
    Number(
      match[1],
    );

  const unit =
    match[2];

  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new RefreshTokenServiceError(
      "REFRESH_TOKEN_EXPIRES_IN contains an invalid duration.",
      "REFRESH_TOKEN_CONFIGURATION_ERROR",
      500,
    );
  }

  const unitMilliseconds:
    Record<
      "s" | "m" | "h" | "d",
      number
    > = {
      s:
        1_000,

      m:
        60_000,

      h:
        3_600_000,

      d:
        86_400_000,
    };

  return (
    value *
    unitMilliseconds[
      unit as
        | "s"
        | "m"
        | "h"
        | "d"
    ]
  );
}

function getRefreshTokenExpiryDate():
  Date {
  const duration =
    env.REFRESH_TOKEN_EXPIRES_IN
      ?.trim() ||
    "30d";

  return new Date(
    Date.now() +
      parseDurationToMilliseconds(
        duration,
      ),
  );
}

function validateRefreshTokenFormat(
  refreshToken: string,
): void {
  if (
    !refreshToken.startsWith(
      REFRESH_TOKEN_PREFIX,
    ) ||
    refreshToken.length <
      60
  ) {
    throw new RefreshTokenServiceError(
      "Refresh token is invalid.",
      "REFRESH_TOKEN_INVALID",
      401,
    );
  }
}

export class RefreshTokenService {
  async createSession(
    input:
      CreateAuthSessionInput,
  ): Promise<AuthSessionResult> {
    const refreshToken =
      generateRefreshToken();

    const refreshTokenHash =
      hashRefreshToken(
        refreshToken,
      );

    /*
     * Absolute session expiry.
     *
     * This is created only once at login
     * and is intentionally NOT extended
     * when refresh tokens rotate.
     */
    const expiresAt =
      getRefreshTokenExpiryDate();

    const session =
      await sessionRepository.create(
        {
          userId:
            input.userId,

          refreshTokenHash,

          userAgent:
            input.userAgent ??
            null,

          ipAddress:
            input.ipAddress ??
            null,

          expiresAt,
        },
      );

    const accessToken =
      await jwtService.createAccessToken(
        {
          userId:
            input.userId,

          sessionId:
            session.id,
        },
      );

    return {
      accessToken,

      refreshToken,

      accessTokenExpiresIn:
        env.ACCESS_TOKEN_EXPIRES_IN,

      refreshTokenExpiresAt:
        expiresAt.toISOString(),

      session: {
        id:
          session.id,

        userId:
          session.userId,

        createdAt:
          session.createdAt
            .toISOString(),
      },
    };
  }

  async rotate(
    currentRefreshToken:
      string,
  ): Promise<RotateRefreshTokenResult> {
    validateRefreshTokenFormat(
      currentRefreshToken,
    );

    const currentTokenHash =
      hashRefreshToken(
        currentRefreshToken,
      );

    const existingSession =
      await sessionRepository
        .findByRefreshTokenHash(
          currentTokenHash,
        );

    if (!existingSession) {
      throw new RefreshTokenServiceError(
        "Refresh token is invalid.",
        "REFRESH_TOKEN_INVALID",
        401,
      );
    }

    if (
      existingSession.revokedAt
    ) {
      throw new RefreshTokenServiceError(
        "This session has been revoked.",
        "SESSION_REVOKED",
        401,
      );
    }

    const now =
      Date.now();

    /*
     * Absolute session expiry.
     *
     * Once the original session expiry is
     * reached, the user must sign in again.
     */
    if (
      existingSession
        .expiresAt
        .getTime() <= now
    ) {
      await sessionRepository.revoke(
        existingSession.id,
      );

      throw new RefreshTokenServiceError(
        "Refresh token has expired.",
        "REFRESH_TOKEN_EXPIRED",
        401,
      );
    }

    /*
     * Inactivity timeout.
     *
     * If the session has not been used for
     * seven days, it is revoked and cannot
     * be refreshed again.
     */
    const inactiveFor =
      now -
      existingSession
        .lastUsedAt
        .getTime();

    if (
      inactiveFor >=
      SESSION_INACTIVITY_LIMIT_MS
    ) {
      await sessionRepository.revoke(
        existingSession.id,
      );

      throw new RefreshTokenServiceError(
        "This session expired due to inactivity.",
        "SESSION_INACTIVE",
        401,
      );
    }

    if (
      existingSession
        .user
        .status !==
      "ACTIVE"
    ) {
      await sessionRepository.revoke(
        existingSession.id,
      );

      throw new RefreshTokenServiceError(
        "This account is not currently available.",
        "USER_UNAVAILABLE",
        403,
      );
    }

    const newRefreshToken =
      generateRefreshToken();

    const newRefreshTokenHash =
      hashRefreshToken(
        newRefreshToken,
      );

    /*
     * IMPORTANT:
     *
     * Preserve the ORIGINAL session expiry.
     * Refreshing the token must not start
     * another 30-day period.
     */
    const expiresAt =
      existingSession.expiresAt;

    const updatedSession =
      await sessionRepository
        .updateRefreshToken(
          existingSession.id,
          newRefreshTokenHash,
          expiresAt,
        );

    const accessToken =
      await jwtService.createAccessToken(
        {
          userId:
            existingSession.userId,

          sessionId:
            existingSession.id,
        },
      );

    return {
      accessToken,

      refreshToken:
        newRefreshToken,

      accessTokenExpiresIn:
        env.ACCESS_TOKEN_EXPIRES_IN,

      refreshTokenExpiresAt:
        expiresAt.toISOString(),

      session: {
        id:
          updatedSession.id,

        userId:
          updatedSession.userId,

        lastUsedAt:
          updatedSession
            .lastUsedAt
            .toISOString(),
      },
    };
  }

  async revoke(
    refreshToken: string,
  ): Promise<void> {
    validateRefreshTokenFormat(
      refreshToken,
    );

    const refreshTokenHash =
      hashRefreshToken(
        refreshToken,
      );

    const existingSession =
      await sessionRepository
        .findByRefreshTokenHash(
          refreshTokenHash,
        );

    if (!existingSession) {
      return;
    }

    if (
      !existingSession.revokedAt
    ) {
      await sessionRepository.revoke(
        existingSession.id,
      );
    }
  }

  async revokeAllUserSessions(
    userId: string,
  ): Promise<void> {
    await sessionRepository
      .revokeAllForUser(
        userId,
      );
  }
}

export const refreshTokenService =
  new RefreshTokenService();