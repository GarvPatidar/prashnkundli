import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import {
  TraderProfileServiceError,
  traderProfileService,
} from "./trader-profile.service.js";

const traderProfileSchema = z.object({
  experienceLevel: z.enum([
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
  ]),

  tradingStyle: z.enum([
    "SCALPING",
    "INTRADAY",
    "SWING",
  ]),

  accountSize: z
    .string()
    .trim()
    .min(1)
    .max(50),

  mainChallenge: z
    .string()
    .trim()
    .min(2)
    .max(500),

  preferredTimeframe: z
    .string()
    .trim()
    .min(1)
    .max(20),

  riskTolerance: z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
  ]),

  timezone: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional(),

  country: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional(),
});

function getUserId(
  authUser: { userId: string } | undefined,
): string {
  if (!authUser) {
    throw new Error(
      "Authenticated user context is missing.",
    );
  }

  return authUser.userId;
}

export const usersRoutes: FastifyPluginAsync = async (
  app,
) => {
  app.get(
    "/trader-profile",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const profile =
        await traderProfileService.getProfile(
          getUserId(request.authUser),
        );

      return reply.status(200).send({
        success: true,
        data: profile,
      });
    },
  );

  app.put(
    "/trader-profile",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const parsedRequest =
        traderProfileSchema.safeParse(
          request.body,
        );

      if (!parsedRequest.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Please check the submitted trader profile.",
            fields:
              parsedRequest.error.flatten()
                .fieldErrors,
          },
        });
      }

      try {
        const profile =
          await traderProfileService.saveProfile({
            userId: getUserId(
              request.authUser,
            ),
            experienceLevel:
              parsedRequest.data.experienceLevel,
            tradingStyle:
              parsedRequest.data.tradingStyle,
            accountSize:
              parsedRequest.data.accountSize,
            mainChallenge:
              parsedRequest.data.mainChallenge,
            preferredTimeframe:
              parsedRequest.data
                .preferredTimeframe,
            riskTolerance:
              parsedRequest.data.riskTolerance,
            timezone:
              parsedRequest.data.timezone ??
              null,
            country:
              parsedRequest.data.country ??
              null,
          });

        return reply.status(200).send({
          success: true,
          message:
            "Trader profile saved successfully.",
          data: profile,
        });
      } catch (error) {
        if (
          error instanceof
          TraderProfileServiceError
        ) {
          return reply
            .status(error.statusCode)
            .send({
              success: false,
              error: {
                code: error.code,
                message: error.message,
              },
            });
        }

        request.log.error(
          { error },
          "Trader profile update failed.",
        );

        return reply.status(500).send({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Trader profile could not be saved.",
          },
        });
      }
    },
  );
};