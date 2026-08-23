import { authRepository } from "./auth.repository.js";
import { otpService } from "./otp.service.js";

export interface ForgotPasswordInput {
  phone: string;
  countryCode?: string | undefined;
}

export interface ForgotPasswordResult {
  success: true;
  message: string;

  verification: {
    channel: "whatsapp";
    purpose: "FORGOT_PASSWORD";
    expiresAt: string;
    resendAvailableAt: string;
    debugOtp?: string | undefined;
  };
}

export type ForgotPasswordServiceErrorCode =
  | "INVALID_PHONE"
  | "USER_NOT_FOUND"
  | "ACCOUNT_UNAVAILABLE";

export class ForgotPasswordServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ForgotPasswordServiceErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ForgotPasswordServiceError";
  }
}

function normalizeCountryCode(
  countryCode?: string,
): string {
  const rawCountryCode =
    countryCode?.trim() || "+91";

  const digits = rawCountryCode.replace(/\D/g, "");

  if (!digits || digits.length > 4) {
    throw new ForgotPasswordServiceError(
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
    throw new ForgotPasswordServiceError(
      "Invalid mobile number.",
      "INVALID_PHONE",
      400,
    );
  }

  return completePhone;
}

export class ForgotPasswordService {
  async requestResetOtp(
    input: ForgotPasswordInput,
  ): Promise<ForgotPasswordResult> {
    const countryCode =
      normalizeCountryCode(input.countryCode);

    const phone = normalizePhone(
      countryCode,
      input.phone,
    );

    const user =
      await authRepository.findUserByPhone(phone);

    if (!user) {
      throw new ForgotPasswordServiceError(
        "No account was found with this mobile number.",
        "USER_NOT_FOUND",
        404,
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "DELETED"
    ) {
      throw new ForgotPasswordServiceError(
        "This account is currently unavailable.",
        "ACCOUNT_UNAVAILABLE",
        403,
      );
    }

    await authRepository.revokeActivePasswordResetOtps(
      phone,
    );

    const otpResult =
      await otpService.requestOtp({
        userId: user.id,
        phone: user.phone,
        countryCode: user.countryCode,
        purpose: "FORGOT_PASSWORD",
      });

    return {
      success: true,
      message:
        "A password reset OTP has been sent through WhatsApp.",

      verification: {
        channel: "whatsapp",
        purpose: "FORGOT_PASSWORD",
        expiresAt: otpResult.expiresAt,
        resendAvailableAt:
          otpResult.resendAvailableAt,

        ...(otpResult.debugOtp
          ? {
              debugOtp: otpResult.debugOtp,
            }
          : {}),
      },
    };
  }
}

export const forgotPasswordService =
  new ForgotPasswordService();