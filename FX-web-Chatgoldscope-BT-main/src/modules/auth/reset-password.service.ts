import { authRepository } from "./auth.repository.js";
import { otpService } from "./otp.service.js";
import { hashPassword } from "./password.js";
import { refreshTokenService } from "./refresh-token.service.js";

export interface ResetPasswordInput {
  phone: string;
  countryCode?: string | undefined;
  code: string;
  newPassword: string;
}

export interface ResetPasswordResult {
  success: true;
  message: string;
}

export type ResetPasswordServiceErrorCode =
  | "INVALID_PHONE"
  | "USER_NOT_FOUND"
  | "ACCOUNT_UNAVAILABLE";

export class ResetPasswordServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ResetPasswordServiceErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ResetPasswordServiceError";
  }
}

function normalizeCountryCode(
  countryCode?: string,
): string {
  const rawCountryCode =
    countryCode?.trim() || "+91";

  const digits = rawCountryCode.replace(/\D/g, "");

  if (!digits || digits.length > 4) {
    throw new ResetPasswordServiceError(
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
  const countryCodeDigits =
    countryCode.replace(/\D/g, "");

  let phoneDigits = phone.replace(/\D/g, "");

  phoneDigits = phoneDigits.replace(/^0+/, "");

  if (
    phoneDigits.startsWith(countryCodeDigits) &&
    phoneDigits.length > 10
  ) {
    phoneDigits = phoneDigits.slice(
      countryCodeDigits.length,
    );
  }

  const completePhone =
    countryCodeDigits + phoneDigits;

  if (
    completePhone.length < 8 ||
    completePhone.length > 15
  ) {
    throw new ResetPasswordServiceError(
      "Invalid mobile number.",
      "INVALID_PHONE",
      400,
    );
  }

  return completePhone;
}

export class ResetPasswordService {
  async resetPassword(
    input: ResetPasswordInput,
  ): Promise<ResetPasswordResult> {
    const countryCode =
      normalizeCountryCode(input.countryCode);

    const phone = normalizePhone(
      countryCode,
      input.phone,
    );

    const user =
      await authRepository.findUserByPhone(phone);

    if (!user) {
      throw new ResetPasswordServiceError(
        "No account was found with this mobile number.",
        "USER_NOT_FOUND",
        404,
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "DELETED"
    ) {
      throw new ResetPasswordServiceError(
        "This account is currently unavailable.",
        "ACCOUNT_UNAVAILABLE",
        403,
      );
    }

    await otpService.verifyOtp({
      phone: user.phone,
      countryCode: user.countryCode,
      code: input.code,
      purpose: "FORGOT_PASSWORD",
    });

    const passwordHash = await hashPassword(
      input.newPassword,
    );

    await authRepository.updatePasswordHash(
      user.id,
      passwordHash,
    );

    await refreshTokenService.revokeAllUserSessions(
      user.id,
    );

    return {
      success: true,
      message:
        "Password reset successfully. Please sign in again.",
    };
  }
}

export const resetPasswordService =
  new ResetPasswordService();