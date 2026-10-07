import { authRepository } from "./auth.repository.js";
import { otpService } from "./otp.service.js";
import { hashPassword } from "./password.js";
import {
  PhoneValidationError,
  normalizeCountryCode,
  normalizePhone,
} from "./phone.js";
import { env } from "../../config.js";


export interface SignupInput {
  fullName: string;
  phone: string;
  countryCode?: string | undefined;
  email?: string | null | undefined;
  password: string;
  whatsappConsent: boolean;
}

export interface SignupResult {
  success: true;

  user: {
    id: string;
    fullName: string | null;
    phone: string;
    countryCode: string;
    email: string | null;
    status: string;
    whatsappConsent: boolean;
  };

  verification: {
    required: boolean;
  };
}

export interface ResendSignupOtpInput {
  phone: string;
  countryCode?: string | undefined;
}

export interface ResendSignupOtpResult {
  success: true;
  message: string;

  verification: {
    channel: "whatsapp";
    purpose: "SIGNUP";
    expiresAt: string;
    resendAvailableAt: string;
    debugOtp?: string | undefined;
  };
}

export type AuthServiceErrorCode =
  | "INVALID_FULL_NAME"
  | "INVALID_PHONE"
  | "INVALID_EMAIL"
  | "PHONE_ALREADY_REGISTERED"
  | "EMAIL_ALREADY_REGISTERED"
  | "USER_NOT_FOUND"
  | "ACCOUNT_ALREADY_VERIFIED"
  | "ACCOUNT_UNAVAILABLE";

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AuthServiceErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function normalizeFullName(fullName: string): string {
  const normalizedName = fullName
    .trim()
    .replace(/\s+/g, " ");

  if (
    normalizedName.length < 2 ||
    normalizedName.length > 100
  ) {
    throw new AuthServiceError(
      "Full name must contain between 2 and 100 characters.",
      "INVALID_FULL_NAME",
      400,
    );
  }

  return normalizedName;
}

function normalizePhoneInput(
  countryCodeInput: string | undefined,
  phoneInput: string,
): { countryCode: string; phone: string } {
  try {
    const countryCode =
      normalizeCountryCode(countryCodeInput);

    return {
      countryCode,
      phone: normalizePhone(
        countryCode,
        phoneInput,
      ),
    };
  } catch (error) {
    if (error instanceof PhoneValidationError) {
      throw new AuthServiceError(
        error.message,
        "INVALID_PHONE",
        400,
      );
    }

    throw error;
  }
}

function normalizeEmail(
  email?: string | null,
): string | null {
  const normalizedEmail =
    email?.trim().toLowerCase() || null;

  if (!normalizedEmail) {
    return null;
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    normalizedEmail.length > 254 ||
    !emailPattern.test(normalizedEmail)
  ) {
    throw new AuthServiceError(
      "Invalid email address.",
      "INVALID_EMAIL",
      400,
    );
  }

  return normalizedEmail;
}

function isUniqueConstraintError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code ===
      "P2002"
  );
}

export class AuthService {
  async signup(
    input: SignupInput,
  ): Promise<SignupResult> {
    const fullName = normalizeFullName(
      input.fullName,
    );

    const { countryCode, phone } =
      normalizePhoneInput(
        input.countryCode,
        input.phone,
      );

    const email = normalizeEmail(
      input.email,
    );

    const existingPhoneUser =
      await authRepository.findUserByPhone(
        phone,
      );

    if (existingPhoneUser) {
      throw new AuthServiceError(
        "An account already exists with this mobile number.",
        "PHONE_ALREADY_REGISTERED",
        409,
      );
    }

    if (email) {
      const existingEmailUser =
        await authRepository.findUserByEmail(
          email,
        );

      if (existingEmailUser) {
        throw new AuthServiceError(
          "An account already exists with this email address.",
          "EMAIL_ALREADY_REGISTERED",
          409,
        );
      }
    }

    const passwordHash =
      await hashPassword(
        input.password,
      );

    /*
     * Account + profile are created in ONE write.
     *
     * AUTO_ACTIVATE_USERS=true (development / mock OTP)
     * creates the account already verified. In production
     * with a real OTP provider it is false and the account
     * starts as PENDING_VERIFICATION.
     */
    let activatedUser;

    try {
      activatedUser =
        await authRepository.createUser({
          fullName,
          phone,
          countryCode,
          email,
          passwordHash,
          whatsappConsent:
            input.whatsappConsent,
          autoActivate:
            env.AUTO_ACTIVATE_USERS,
        });
    } catch (error) {
      /*
       * Two simultaneous signups can both pass the
       * "already exists" checks above. The database
       * unique constraint is the final guard.
       */
      if (isUniqueConstraintError(error)) {
        const target = JSON.stringify(
          (error as { meta?: unknown }).meta ??
            "",
        ).toLowerCase();

        if (target.includes("email")) {
          throw new AuthServiceError(
            "An account already exists with this email address.",
            "EMAIL_ALREADY_REGISTERED",
            409,
          );
        }

        throw new AuthServiceError(
          "An account already exists with this mobile number.",
          "PHONE_ALREADY_REGISTERED",
          409,
        );
      }

      throw error;
    }

    return {
      success: true,

      user: {
        id: activatedUser.id,
        fullName:
          activatedUser.fullName,
        phone: activatedUser.phone,
        countryCode:
          activatedUser.countryCode,
        email: activatedUser.email,
        status: activatedUser.status,
        whatsappConsent:
          activatedUser.whatsappConsent,
      },

      verification: {
        required:
          !env.AUTO_ACTIVATE_USERS,
      },
    };
  }

  /*
   * OTP resend is kept here for future use.
   * Once the WhatsApp OTP provider is configured,
   * this method can be used again.
   */
  async resendSignupOtp(
    input: ResendSignupOtpInput,
  ): Promise<ResendSignupOtpResult> {
    const { phone } =
      normalizePhoneInput(
        input.countryCode,
        input.phone,
      );

    const user =
      await authRepository.findUserByPhone(
        phone,
      );

    if (!user) {
      throw new AuthServiceError(
        "No account was found with this mobile number.",
        "USER_NOT_FOUND",
        404,
      );
    }

    if (
      user.status === "ACTIVE" ||
      user.phoneVerifiedAt
    ) {
      throw new AuthServiceError(
        "This mobile number has already been verified.",
        "ACCOUNT_ALREADY_VERIFIED",
        409,
      );
    }

    if (
      user.status === "SUSPENDED" ||
      user.status === "DELETED"
    ) {
      throw new AuthServiceError(
        "This account is currently unavailable.",
        "ACCOUNT_UNAVAILABLE",
        403,
      );
    }

    const otpResult =
      await otpService.requestOtp({
        userId: user.id,
        phone: user.phone,
        countryCode: user.countryCode,
        purpose: "SIGNUP",
      });

    return {
      success: true,

      message:
        "A new verification OTP has been sent through WhatsApp.",

      verification: {
        channel: "whatsapp",
        purpose: "SIGNUP",
        expiresAt:
          otpResult.expiresAt,
        resendAvailableAt:
          otpResult.resendAvailableAt,
        ...(otpResult.debugOtp
          ? {
              debugOtp:
                otpResult.debugOtp,
            }
          : {}),
      },
    };
  }
}

export const authService =
  new AuthService();