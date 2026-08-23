import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  JwtServiceError,
  jwtService,
} from "./jwt.service.js";

import {
  sessionRepository,
} from "./session.repository.js";

const SESSION_INACTIVITY_LIMIT_MS =
  7 * 24 * 60 * 60 * 1_000;

const SESSION_ACTIVITY_TOUCH_INTERVAL_MS =
  5 * 60 * 1_000;

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authorizationHeader =
    request.headers.authorization;

  if (
    !authorizationHeader ||
    !authorizationHeader.startsWith(
      "Bearer ",
    )
  ) {
    await reply.status(401).send({
      success: false,

      error: {
        code:
          "AUTHENTICATION_REQUIRED",

        message:
          "Access token is required.",
      },
    });

    return;
  }

  const accessToken =
    authorizationHeader
      .slice(
        "Bearer ".length,
      )
      .trim();

  let tokenPayload:
    Awaited<
      ReturnType<
        typeof jwtService.verifyAccessToken
      >
    >;

  try {
    tokenPayload =
      await jwtService.verifyAccessToken(
        accessToken,
      );
  } catch (error) {
    const message =
      error instanceof
        JwtServiceError &&
      error.code ===
        "TOKEN_EXPIRED"
        ? "Access token has expired."
        : "Access token is invalid.";

    const code =
      error instanceof
        JwtServiceError
        ? error.code
        : "TOKEN_INVALID";

    await reply.status(401).send({
      success: false,

      error: {
        code,
        message,
      },
    });

    return;
  }

  const session =
    await sessionRepository.findById(
      tokenPayload.sessionId,
    );

  const now =
    Date.now();

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <=
      now
  ) {
    await reply.status(401).send({
      success: false,

      error: {
        code:
          "SESSION_INVALID",

        message:
          "Your session is invalid or has expired.",
      },
    });

    return;
  }

  const inactiveFor =
    now -
    session.lastUsedAt.getTime();

  if (
    inactiveFor >=
    SESSION_INACTIVITY_LIMIT_MS
  ) {
    await sessionRepository.revoke(
      session.id,
    );

    await reply.status(401).send({
      success: false,

      error: {
        code:
          "SESSION_INACTIVE",

        message:
          "Your session expired due to inactivity. Please sign in again.",
      },
    });

    return;
  }

  if (
    session.userId !==
      tokenPayload.userId ||
    session.user.status !==
      "ACTIVE"
  ) {
    await reply.status(403).send({
      success: false,

      error: {
        code:
          "ACCOUNT_UNAVAILABLE",

        message:
          "This account is not currently available.",
      },
    });

    return;
  }

  request.authUser = {
    userId:
      tokenPayload.userId,

    sessionId:
      tokenPayload.sessionId,
  };

  const touchThreshold =
    new Date(
      now -
        SESSION_ACTIVITY_TOUCH_INTERVAL_MS,
    );

  await sessionRepository
    .touchIfOlderThan(
      session.id,
      touchThreshold,
    );
}