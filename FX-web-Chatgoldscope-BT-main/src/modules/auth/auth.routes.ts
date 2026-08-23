import type {
  FastifyPluginAsync,
  FastifyReply,
} from "fastify";
import { z } from "zod";

import { authRepository } from "./auth.repository.js";
import {
  AuthServiceError,
  authService,
} from "./auth.service.js";
import {
  LoginServiceError,
  loginService,
} from "./login.service.js";
import {
  OtpServiceError,
  otpService,
} from "./otp.service.js";
import {
  RefreshTokenServiceError,
  refreshTokenService,
} from "./refresh-token.service.js";
import { requireAuth } from "./auth.middleware.js";
import {
  ForgotPasswordServiceError,
  forgotPasswordService,
} from "./forgot-password.service.js";
import {
  ResetPasswordServiceError,
  resetPasswordService,
} from "./reset-password.service.js";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(100),
  phone: z.string().trim().min(7).max(20),
  countryCode: z.string().trim().min(1).max(5).default("+91"),
  email: z.string().trim().email().max(254).nullable().optional(),
  password: z.string().min(8).max(128),
  whatsappConsent: z.boolean(),
});

const resendOtpSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  countryCode: z.string().trim().min(1).max(5).default("+91"),
});

const verifyOtpSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  countryCode: z.string().trim().min(1).max(5).default("+91"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must contain exactly 6 digits."),
});

const loginSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  countryCode: z.string().trim().min(1).max(5).default("+91"),
  password: z.string().min(8).max(128),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(60, "Refresh token is invalid."),
});

const logoutSchema = z.object({
  refreshToken: z.string().trim().min(60, "Refresh token is invalid."),
});

const resetPasswordSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20),

  countryCode: z
    .string()
    .trim()
    .min(1)
    .max(5)
    .default("+91"),

  code: z
    .string()
    .trim()
    .regex(
      /^\d{6}$/,
      "OTP must contain exactly 6 digits.",
    ),

  newPassword: z
    .string()
    .min(8)
    .max(128),
});

type KnownAuthError =
  | AuthServiceError
  | OtpServiceError
  | LoginServiceError
  | RefreshTokenServiceError
  | ForgotPasswordServiceError
  | ResetPasswordServiceError;

function sendKnownAuthError(
  reply: FastifyReply,
  error: KnownAuthError,
) {
  return reply.status(error.statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error instanceof OtpServiceError && error.metadata
        ? { metadata: error.metadata }
        : {}),
    },
  });
}
const forgotPasswordSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20),

  countryCode: z
    .string()
    .trim()
    .min(1)
    .max(5)
    .default("+91"),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/signup", async (request, reply) => {
    const parsedRequest = signupSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the submitted signup information.",
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await authService.signup({
        fullName: parsedRequest.data.fullName,
        phone: parsedRequest.data.phone,
        countryCode: parsedRequest.data.countryCode,
        email: parsedRequest.data.email ?? null,
        password: parsedRequest.data.password,
        whatsappConsent: parsedRequest.data.whatsappConsent,
      });

      return reply.status(201).send(result);
    } catch (error) {
      if (
        error instanceof AuthServiceError ||
        error instanceof OtpServiceError
      ) {
        return sendKnownAuthError(reply, error);
      }

      request.log.error({ error }, "Signup request failed.");

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Account creation could not be completed.",
        },
      });
    }
  });

  app.post("/resend-otp", async (request, reply) => {
    const parsedRequest = resendOtpSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the submitted mobile number.",
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await authService.resendSignupOtp({
        phone: parsedRequest.data.phone,
        countryCode: parsedRequest.data.countryCode,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (
        error instanceof AuthServiceError ||
        error instanceof OtpServiceError
      ) {
        return sendKnownAuthError(reply, error);
      }

      request.log.error({ error }, "OTP resend request failed.");

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "A new OTP could not be sent.",
        },
      });
    }
  });

  app.post("/verify-otp", async (request, reply) => {
    const parsedRequest = verifyOtpSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the submitted OTP information.",
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const verification = await otpService.verifyOtp({
        phone: parsedRequest.data.phone,
        countryCode: parsedRequest.data.countryCode,
        code: parsedRequest.data.code,
        purpose: "SIGNUP",
      });

      const user = await authRepository.findUserById(verification.userId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "The verified account could not be found.",
          },
        });
      }

      return reply.status(200).send({
        success: true,
        message: "WhatsApp OTP verified successfully.",
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          countryCode: user.countryCode,
          email: user.email,
          status: user.status,
          phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
          whatsappConsent: user.whatsappConsent,
          onboardingCompleted:
            user.profile?.onboardingCompleted ?? false,
        },
      });
    } catch (error) {
      if (error instanceof OtpServiceError) {
        return sendKnownAuthError(reply, error);
      }

      request.log.error({ error }, "OTP verification request failed.");

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "OTP verification could not be completed.",
        },
      });
    }
  });

  app.post("/login", async (request, reply) => {
    const parsedRequest = loginSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the submitted login information.",
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await loginService.login({
        phone: parsedRequest.data.phone,
        countryCode: parsedRequest.data.countryCode,
        password: parsedRequest.data.password,
        userAgent: request.headers["user-agent"] ?? null,
        ipAddress: request.ip,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof LoginServiceError) {
        return sendKnownAuthError(reply, error);
      }

      request.log.error({ error }, "Login request failed.");

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Login could not be completed.",
        },
      });
    }
  });

  app.post("/refresh", async (request, reply) => {
    const parsedRequest = refreshTokenSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid refresh token.",
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await refreshTokenService.rotate(
        parsedRequest.data.refreshToken,
      );

      return reply.status(200).send({
        success: true,
        authentication: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accessTokenExpiresIn: result.accessTokenExpiresIn,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt,
          sessionId: result.session.id,
        },
      });
    } catch (error) {
      if (error instanceof RefreshTokenServiceError) {
        return sendKnownAuthError(reply, error);
      }

      request.log.error({ error }, "Refresh-token request failed.");

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "The authentication session could not be refreshed.",
        },
      });
    }
  });

  app.post("/logout", async (request, reply) => {
    const parsedRequest = logoutSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid refresh token.",
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
    }

    try {
      await refreshTokenService.revoke(parsedRequest.data.refreshToken);

      return reply.status(200).send({
        success: true,
        message: "Logged out successfully.",
      });
    } catch (error) {
      if (error instanceof RefreshTokenServiceError) {
        return sendKnownAuthError(reply, error);
      }

      request.log.error({ error }, "Logout request failed.");

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Logout could not be completed.",
        },
      });
    }
  });

  app.get(
  "/me",
  {
    preHandler: requireAuth,
  },
  async (request, reply) => {
    const authUser = request.authUser;

    if (!authUser) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
      });
    }

    const user =
      await authRepository.findUserById(
        authUser.userId,
      );

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User could not be found.",
        },
      });
    }

    return reply.status(200).send({
      success: true,

      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        countryCode: user.countryCode,
        email: user.email,
        status: user.status,
        phoneVerifiedAt:
          user.phoneVerifiedAt?.toISOString() ??
          null,
        emailVerifiedAt:
          user.emailVerifiedAt?.toISOString() ??
          null,
        whatsappConsent:
          user.whatsappConsent,
        onboardingCompleted:
          user.profile?.onboardingCompleted ??
          false,
        profile: user.profile,
      },

      session: {
        id: authUser.sessionId,
      },
    });
  },
);
app.post(
  "/forgot-password",
  async (request, reply) => {
    const parsedRequest =
      forgotPasswordSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,

        error: {
          code: "VALIDATION_ERROR",
          message:
            "Please check the submitted mobile number.",
          fields:
            parsedRequest.error.flatten()
              .fieldErrors,
        },
      });
    }

    try {
      const result =
        await forgotPasswordService.requestResetOtp({
          phone: parsedRequest.data.phone,
          countryCode:
            parsedRequest.data.countryCode,
        });

      return reply.status(200).send(result);
    } catch (error) {
      if (
        error instanceof
          ForgotPasswordServiceError ||
        error instanceof OtpServiceError
      ) {
        return sendKnownAuthError(
          reply,
          error,
        );
      }

      request.log.error(
        {
          error,
        },
        "Forgot-password request failed.",
      );

      return reply.status(500).send({
        success: false,

        error: {
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Password reset OTP could not be sent.",
        },
      });
    }
  },
);
app.post(
  "/reset-password",
  async (request, reply) => {
    const parsedRequest =
      resetPasswordSchema.safeParse(request.body);

    if (!parsedRequest.success) {
      return reply.status(400).send({
        success: false,

        error: {
          code: "VALIDATION_ERROR",
          message:
            "Please check the submitted password-reset information.",
          fields:
            parsedRequest.error.flatten()
              .fieldErrors,
        },
      });
    }

    try {
      const result =
        await resetPasswordService.resetPassword({
          phone: parsedRequest.data.phone,
          countryCode:
            parsedRequest.data.countryCode,
          code: parsedRequest.data.code,
          newPassword:
            parsedRequest.data.newPassword,
        });

      return reply.status(200).send(result);
    } catch (error) {
      if (
        error instanceof
          ResetPasswordServiceError ||
        error instanceof OtpServiceError
      ) {
        return sendKnownAuthError(
          reply,
          error,
        );
      }

      request.log.error(
        {
          error,
        },
        "Reset-password request failed.",
      );

      return reply.status(500).send({
        success: false,

        error: {
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Password reset could not be completed.",
        },
      });
    }
  },
);
};
