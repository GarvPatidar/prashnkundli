import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import type { OtpPurpose } from "../../generated/prisma/enums.js";
import { env } from "../../config.js";
import { authRepository } from "./auth.repository.js";

const OTP_LENGTH = 6;
const DEFAULT_OTP_EXPIRY_MINUTES = 5;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

interface RequestOtpInput {
  userId: string;
  phone: string;
  countryCode: string;
  purpose: OtpPurpose;
}

interface VerifyOtpInput {
  phone: string;
  countryCode: string;
  purpose: OtpPurpose;
  code: string;
}

interface RequestOtpResult {
  success: true;
  phone: string;
  expiresAt: string;
  resendAvailableAt: string;
  debugOtp?: string;
}

interface VerifyOtpResult {
  success: true;
  userId: string;
  phone: string;
  purpose: OtpPurpose;
}

interface WhatsAppApiResponse {
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
}

export class OtpServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_PHONE"
      | "INVALID_OTP"
      | "OTP_EXPIRED"
      | "OTP_ATTEMPTS_EXCEEDED"
      | "OTP_RESEND_BLOCKED"
      | "OTP_DELIVERY_FAILED"
      | "USER_NOT_FOUND",
    public readonly statusCode: number,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OtpServiceError";
  }
}

function normalizeCountryCode(countryCode: string): string {
  const digits = countryCode.replace(/\D/g, "");

  if (!digits || digits.length > 4) {
    throw new OtpServiceError(
      "Invalid country code.",
      "INVALID_PHONE",
      400,
    );
  }

  return digits;
}

function normalizePhone(
  countryCode: string,
  phone: string,
): string {
  const normalizedCountryCode =
    normalizeCountryCode(countryCode);

  let phoneDigits = phone.replace(/\D/g, "");

  if (phoneDigits.startsWith("0")) {
    phoneDigits = phoneDigits.replace(/^0+/, "");
  }

  if (phoneDigits.startsWith(normalizedCountryCode)) {
    phoneDigits = phoneDigits.slice(
      normalizedCountryCode.length,
    );
  }

  const completePhone =
    normalizedCountryCode + phoneDigits;

  if (
    completePhone.length < 8 ||
    completePhone.length > 15
  ) {
    throw new OtpServiceError(
      "Invalid mobile number.",
      "INVALID_PHONE",
      400,
    );
  }

  return completePhone;
}

function generateOtp(): string {
  const minimum = 10 ** (OTP_LENGTH - 1);
  const maximum = 10 ** OTP_LENGTH;

  return randomInt(minimum, maximum).toString();
}

function hashOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): string {
  return createHmac(
    "sha256",
    getOtpHashSecret(),
  )
    .update(`${phone}:${purpose}:${code}`)
    .digest("hex");
}

function securelyCompareHashes(
  storedHash: string,
  suppliedHash: string,
): boolean {
  try {
    const storedBuffer = Buffer.from(
      storedHash,
      "hex",
    );

    const suppliedBuffer = Buffer.from(
      suppliedHash,
      "hex",
    );

    if (
      storedBuffer.length === 0 ||
      storedBuffer.length !== suppliedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      storedBuffer,
      suppliedBuffer,
    );
  } catch {
    return false;
  }
}

function getOtpHashSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "OTP_HASH_SECRET must contain at least 32 characters.",
    );
  }

  return secret;
}

function getOtpExpiryMinutes(): number {
  const rawValue =
    process.env.OTP_EXPIRES_MINUTES;

  if (!rawValue) {
    return DEFAULT_OTP_EXPIRY_MINUTES;
  }

  const parsedValue = Number(rawValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 15
  ) {
    throw new Error(
      "OTP_EXPIRES_MINUTES must be an integer between 1 and 15.",
    );
  }

  return parsedValue;
}

function getResendCooldownSeconds(): number {
  const rawValue =
    process.env.OTP_RESEND_COOLDOWN_SECONDS;

  if (!rawValue) {
    return DEFAULT_RESEND_COOLDOWN_SECONDS;
  }

  const parsedValue = Number(rawValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 30 ||
    parsedValue > 300
  ) {
    throw new Error(
      "OTP_RESEND_COOLDOWN_SECONDS must be between 30 and 300.",
    );
  }

  return parsedValue;
}

function getWhatsAppApiVersion(): string {
  return (
    process.env.WHATSAPP_GRAPH_API_VERSION ??
    "v23.0"
  );
}

function getWhatsAppTemplateLanguage(): string {
  return (
    process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE ??
    "en"
  );
}

async function parseWhatsAppResponse(
  response: Response,
): Promise<WhatsAppApiResponse> {
  const responseBody: unknown =
    await response.json();

  if (
    typeof responseBody !== "object" ||
    responseBody === null
  ) {
    return {};
  }

  return responseBody as WhatsAppApiResponse;
}

async function sendOtpThroughWhatsApp(
  phone: string,
  otp: string,
): Promise<void> {
  if (env.OTP_PROVIDER === "mock") {
    if (env.NODE_ENV === "production") {
      throw new OtpServiceError(
        "Mock OTP provider cannot be used in production.",
        "OTP_DELIVERY_FAILED",
        500,
      );
    }

    console.info(
      `[GoldScope Mock WhatsApp OTP] ${phone}: ${otp}`,
    );

    return;
  }

  const apiToken = env.WHATSAPP_API_TOKEN;
  const phoneNumberId =
    env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName =
    env.WHATSAPP_TEMPLATE_NAME;

  if (
    !apiToken ||
    !phoneNumberId ||
    !templateName
  ) {
    throw new OtpServiceError(
      "WhatsApp OTP provider is not configured.",
      "OTP_DELIVERY_FAILED",
      500,
    );
  }

  const graphApiVersion =
    getWhatsAppApiVersion();

  const endpoint =
    `https://graph.facebook.com/` +
    `${graphApiVersion}/` +
    `${phoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",

      template: {
        name: templateName,

        language: {
          code: getWhatsAppTemplateLanguage(),
        },

        components: [
          {
            type: "body",

            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
        ],
      },
    }),
  });

  const responseBody =
    await parseWhatsAppResponse(response);

  if (
    !response.ok ||
    responseBody.error ||
    !responseBody.messages?.[0]?.id
  ) {
    console.error(
      "WhatsApp OTP delivery failed:",
      responseBody.error ?? responseBody,
    );

    throw new OtpServiceError(
      "OTP could not be delivered through WhatsApp.",
      "OTP_DELIVERY_FAILED",
      502,
    );
  }
}

export class OtpService {
  async requestOtp(
    input: RequestOtpInput,
  ): Promise<RequestOtpResult> {
    const normalizedPhone = normalizePhone(
      input.countryCode,
      input.phone,
    );

    const user =
      await authRepository.findUserById(
        input.userId,
      );

    if (
      !user ||
      normalizePhone(
        user.countryCode,
        user.phone,
      ) !== normalizedPhone
    ) {
      throw new OtpServiceError(
        "User could not be found.",
        "USER_NOT_FOUND",
        404,
      );
    }

    const existingOtp =
      await authRepository.findLatestActiveOtp(
        normalizedPhone,
        input.purpose,
      );

    const resendCooldownSeconds =
      getResendCooldownSeconds();

    if (existingOtp) {
      const resendAvailableAt = new Date(
        existingOtp.createdAt.getTime() +
          resendCooldownSeconds * 1_000,
      );

      if (
        resendAvailableAt.getTime() >
        Date.now()
      ) {
        const retryAfterSeconds = Math.ceil(
          (resendAvailableAt.getTime() -
            Date.now()) /
            1_000,
        );

        throw new OtpServiceError(
          `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
          "OTP_RESEND_BLOCKED",
          429,
          {
            retryAfterSeconds,
            resendAvailableAt:
              resendAvailableAt.toISOString(),
          },
        );
      }
    }

    await authRepository.invalidateActiveOtpCodes(
      normalizedPhone,
      input.purpose,
    );

    const otp = generateOtp();

    const expiresAt = new Date(
      Date.now() +
        getOtpExpiryMinutes() * 60_000,
    );

    const createdOtp =
      await authRepository.createOtp({
        userId: user.id,
        phone: normalizedPhone,
        purpose: input.purpose,
        codeHash: hashOtp(
          normalizedPhone,
          input.purpose,
          otp,
        ),
        expiresAt,
        maxAttempts: 5,
      });

    try {
      await sendOtpThroughWhatsApp(
        normalizedPhone,
        otp,
      );
    } catch (error) {
      await authRepository.consumeOtp(
        createdOtp.id,
      );

      throw error;
    }

    const resendAvailableAt = new Date(
      Date.now() +
        resendCooldownSeconds * 1_000,
    );

    const result: RequestOtpResult = {
      success: true,
      phone: normalizedPhone,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt:
        resendAvailableAt.toISOString(),
    };

    if (
      env.OTP_PROVIDER === "mock" &&
      env.NODE_ENV !== "production"
    ) {
      result.debugOtp = otp;
    }

    return result;
  }

  async verifyOtp(
    input: VerifyOtpInput,
  ): Promise<VerifyOtpResult> {
    const normalizedPhone = normalizePhone(
      input.countryCode,
      input.phone,
    );

    if (!/^\d{6}$/.test(input.code)) {
      throw new OtpServiceError(
        "Invalid OTP.",
        "INVALID_OTP",
        400,
      );
    }

    const storedOtp =
      await authRepository.findLatestActiveOtp(
        normalizedPhone,
        input.purpose,
      );

    if (!storedOtp) {
      throw new OtpServiceError(
        "OTP is invalid or has expired.",
        "OTP_EXPIRED",
        400,
      );
    }

    if (storedOtp.expiresAt.getTime() <= Date.now()) {
      await authRepository.consumeOtp(
        storedOtp.id,
      );

      throw new OtpServiceError(
        "OTP has expired.",
        "OTP_EXPIRED",
        400,
      );
    }

    if (
      storedOtp.attempts >=
      storedOtp.maxAttempts
    ) {
      await authRepository.consumeOtp(
        storedOtp.id,
      );

      throw new OtpServiceError(
        "Maximum OTP attempts exceeded.",
        "OTP_ATTEMPTS_EXCEEDED",
        429,
      );
    }

    const suppliedHash = hashOtp(
      normalizedPhone,
      input.purpose,
      input.code,
    );

    const isValid = securelyCompareHashes(
      storedOtp.codeHash,
      suppliedHash,
    );

    if (!isValid) {
      const updatedOtp =
        await authRepository.incrementOtpAttempts(
          storedOtp.id,
        );

      if (
        updatedOtp.attempts >=
        updatedOtp.maxAttempts
      ) {
        await authRepository.consumeOtp(
          updatedOtp.id,
        );

        throw new OtpServiceError(
          "Maximum OTP attempts exceeded.",
          "OTP_ATTEMPTS_EXCEEDED",
          429,
        );
      }

      throw new OtpServiceError(
        "Invalid OTP.",
        "INVALID_OTP",
        400,
        {
          attemptsRemaining:
            updatedOtp.maxAttempts -
            updatedOtp.attempts,
        },
      );
    }

    await authRepository.consumeOtp(
      storedOtp.id,
    );

    const user =
      storedOtp.userId
        ? await authRepository.findUserById(
            storedOtp.userId,
          )
        : await authRepository.findUserByPhone(
            normalizedPhone,
          );

    if (!user) {
      throw new OtpServiceError(
        "User could not be found.",
        "USER_NOT_FOUND",
        404,
      );
    }

    if (input.purpose === "SIGNUP") {
      await authRepository.activateUser(
        user.id,
      );
    }

    return {
      success: true,
      userId: user.id,
      phone: normalizedPhone,
      purpose: input.purpose,
    };
  }
}

export const otpService = new OtpService();