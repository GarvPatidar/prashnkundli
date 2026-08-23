import { authRepository } from "./auth.repository.js";
import { verifyPassword } from "./password.js";
import { refreshTokenService } from "./refresh-token.service.js";

export interface LoginInput {
  phone: string;
  countryCode?: string | undefined;
  password: string;
  userAgent?: string | null | undefined;
  ipAddress?: string | null | undefined;
}

export interface LoginResult {
  success: true;

  user: {
    id: string;
    fullName: string | null;
    phone: string;
    countryCode: string;
    email: string | null;
    status: string;
    phoneVerifiedAt: string | null;
    onboardingCompleted: boolean;
  };

  authentication: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresAt: string;
    sessionId: string;
  };
}

export type LoginServiceErrorCode =
  | "INVALID_PHONE"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_NOT_VERIFIED"
  | "ACCOUNT_UNAVAILABLE"
  | "PASSWORD_LOGIN_UNAVAILABLE";

export class LoginServiceError extends Error {
  constructor(
    message: string,
    public readonly code: LoginServiceErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "LoginServiceError";
  }
}

function normalizeCountryCode(
  countryCode?: string,
): string {
  const rawCountryCode = countryCode?.trim() || "+91";
  const digits = rawCountryCode.replace(/\D/g, "");

  if (!digits || digits.length > 4) {
    throw new LoginServiceError(
      "Invalid country code.",
      "INVALID_PHONE",
      400,
    );
  }

  return `+${digits}`;
}

function normalizePhone(
  countryCode: string,
  phone: string,
): string {
  const countryCodeDigits = countryCode.replace(/\D/g, "");
  let phoneDigits = phone.replace(/\D/g, "");

  phoneDigits = phoneDigits.replace(/^0+/, "");

  if (
    phoneDigits.startsWith(countryCodeDigits) &&
    phoneDigits.length > 10
  ) {
    phoneDigits = phoneDigits.slice(countryCodeDigits.length);
  }

  const completePhone = countryCodeDigits + phoneDigits;

  if (
    completePhone.length < 8 ||
    completePhone.length > 15
  ) {
    throw new LoginServiceError(
      "Invalid mobile number.",
      "INVALID_PHONE",
      400,
    );
  }

  return completePhone;
}

export class LoginService {
  async login(input: LoginInput): Promise<LoginResult> {
    const countryCode = normalizeCountryCode(
      input.countryCode,
    );

    const phone = normalizePhone(
      countryCode,
      input.phone,
    );

    const user =
      await authRepository.findUserByPhone(phone);

    if (!user || !user.passwordHash) {
      throw new LoginServiceError(
        "Mobile number or password is incorrect.",
        "INVALID_CREDENTIALS",
        401,
      );
    }

    const isPasswordValid = await verifyPassword(
      user.passwordHash,
      input.password,
    );

    if (!isPasswordValid) {
      throw new LoginServiceError(
        "Mobile number or password is incorrect.",
        "INVALID_CREDENTIALS",
        401,
      );
    }

    if (
      user.status === "PENDING_VERIFICATION" ||
      !user.phoneVerifiedAt
    ) {
      throw new LoginServiceError(
        "Please verify your WhatsApp OTP before signing in.",
        "ACCOUNT_NOT_VERIFIED",
        403,
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "DELETED"
    ) {
      throw new LoginServiceError(
        "This account is currently unavailable.",
        "ACCOUNT_UNAVAILABLE",
        403,
      );
    }

    if (user.status !== "ACTIVE") {
      throw new LoginServiceError(
        "This account cannot use password login.",
        "PASSWORD_LOGIN_UNAVAILABLE",
        403,
      );
    }

    const authSession =
      await refreshTokenService.createSession({
        userId: user.id,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
      });

    await authRepository.updateLastLogin(user.id);

    return {
      success: true,

      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        countryCode: user.countryCode,
        email: user.email,
        status: user.status,
        phoneVerifiedAt:
          user.phoneVerifiedAt?.toISOString() ?? null,
        onboardingCompleted:
          user.profile?.onboardingCompleted ?? false,
      },

      authentication: {
        accessToken: authSession.accessToken,
        refreshToken: authSession.refreshToken,
        accessTokenExpiresIn:
          authSession.accessTokenExpiresIn,
        refreshTokenExpiresAt:
          authSession.refreshTokenExpiresAt,
        sessionId: authSession.session.id,
      },
    };
  }
}

export const loginService = new LoginService();