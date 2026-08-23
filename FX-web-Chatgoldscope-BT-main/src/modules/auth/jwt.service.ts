import {
  SignJWT,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
} from "jose";

import { env } from "../../config.js";

const TOKEN_ISSUER = "goldscope-backend";
const TOKEN_AUDIENCE = "goldscope-app";
const ACCESS_TOKEN_ALGORITHM = "HS256";

export interface AccessTokenPayload {
  userId: string;
  sessionId: string;
}

export interface VerifiedAccessToken {
  userId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export type JwtServiceErrorCode =
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_CONFIGURATION_ERROR";

export class JwtServiceError extends Error {
  constructor(
    message: string,
    public readonly code: JwtServiceErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "JwtServiceError";
  }
}

function getAccessTokenSecret(): Uint8Array {
  const secret = env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new JwtServiceError(
      "JWT_ACCESS_SECRET must contain at least 32 characters.",
      "TOKEN_CONFIGURATION_ERROR",
      500,
    );
  }

  return new TextEncoder().encode(secret);
}

function getAccessTokenExpiry(): string {
  const expiry = env.ACCESS_TOKEN_EXPIRES_IN?.trim();

  if (!expiry) {
    return "15m";
  }

  return expiry;
}

function validatePayload(
  payload: JWTPayload,
): VerifiedAccessToken {
  const userId = payload.sub;
  const sessionId = payload.sid;
  const issuedAt = payload.iat;
  const expiresAt = payload.exp;

  if (
    typeof userId !== "string" ||
    typeof sessionId !== "string" ||
    typeof issuedAt !== "number" ||
    typeof expiresAt !== "number"
  ) {
    throw new JwtServiceError(
      "Access token payload is invalid.",
      "TOKEN_INVALID",
      401,
    );
  }

  return {
    userId,
    sessionId,
    issuedAt,
    expiresAt,
  };
}

export class JwtService {
  async createAccessToken(
    input: AccessTokenPayload,
  ): Promise<string> {
    return new SignJWT({
      sid: input.sessionId,
    })
      .setProtectedHeader({
        alg: ACCESS_TOKEN_ALGORITHM,
        typ: "JWT",
      })
      .setSubject(input.userId)
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(getAccessTokenExpiry())
      .sign(getAccessTokenSecret());
  }

  async verifyAccessToken(
    token: string,
  ): Promise<VerifiedAccessToken> {
    try {
      const verification = await jwtVerify(
        token,
        getAccessTokenSecret(),
        {
          issuer: TOKEN_ISSUER,
          audience: TOKEN_AUDIENCE,
          algorithms: [ACCESS_TOKEN_ALGORITHM],
        },
      );

      return validatePayload(
        verification.payload,
      );
    } catch (error) {
      if (
        error instanceof joseErrors.JWTExpired
      ) {
        throw new JwtServiceError(
          "Access token has expired.",
          "TOKEN_EXPIRED",
          401,
        );
      }

      if (error instanceof JwtServiceError) {
        throw error;
      }

      throw new JwtServiceError(
        "Access token is invalid.",
        "TOKEN_INVALID",
        401,
      );
    }
  }
}

export const jwtService = new JwtService();