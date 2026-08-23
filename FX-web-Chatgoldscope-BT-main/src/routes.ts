import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { executeChat } from "./chat.service.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { marketProvider } from "./providers.js";
import { conversationRepository } from "./repository.js";
import {
  attachmentService,
} from "./modules/attachments/attachment.service.js";
const chatSchema = z.object({
  conversationId: z.string().nullable().optional(),
  message: z.string().trim().min(1).max(5000),

  traderProfile: z
    .record(z.string(), z.string())
    .optional(),

  position: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional(),

  attachment: z
  .object({
    id:
      z.string().min(1),

    fileName:
      z.string().min(1),

    mimeType:
      z.enum([
        "image/png",
        "image/jpeg",
        "image/webp",
      ]),

    size:
      z.number().positive(),
  })
  .nullable()
  .optional(),
});

const conversationParamsSchema = z.object({
  id: z.string().min(1),
});

interface ProgressEvent {
  type: string;
  message: string;
  data?: unknown;
}

function createSseEvent(
  event: ProgressEvent,
): string {
  return [
    `event: ${event.type}`,
    `data: ${JSON.stringify({
      message: event.message,
      data: event.data ?? null,
      timestamp: new Date().toISOString(),
    })}`,
    "",
    "",
  ].join("\n");
}

function getAuthenticatedUserId(
  authUser: { userId: string } | undefined,
): string {
  if (!authUser) {
    throw new Error(
      "Authenticated user context is missing.",
    );
  }

  return authUser.userId;
}

export const routes: FastifyPluginAsync = async (
  app,
) => {
  app.get("/health", async () => {
    return {
      success: true,
      service: "GoldScope Backend",
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/market/snapshot", async () => {
    return {
      success: true,
      data: await marketProvider.getSnapshot(),
    };
  });

  app.post(
    "/chat",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const parsedRequest = chatSchema.safeParse(
        request.body,
      );

      if (!parsedRequest.success) {
        return reply.status(400).send({
          success: false,

          error: {
            code: "VALIDATION_ERROR",
            message:
              "Please check the submitted chat request.",
            fields:
              parsedRequest.error.flatten()
                .fieldErrors,
          },
        });
      }

      const userId = getAuthenticatedUserId(
        request.authUser,
      );

      const result = await executeChat(
        userId,
        parsedRequest.data,
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

app.post(
  "/attachments",
  {
    preHandler:
      requireAuth,
  },
  async (
    request,
    reply,
  ) => {
    const userId =
      getAuthenticatedUserId(
        request.authUser,
      );

    const file =
      await request.file();

    if (!file) {
      return reply
        .status(400)
        .send({
          success:
            false,

          error: {
            code:
              "ATTACHMENT_REQUIRED",

            message:
              "Please select an image to upload.",
          },
        });
    }

    const buffer =
      await file.toBuffer();

    try {
      const attachment =
        await attachmentService.save({
          userId,

          fileName:
            file.filename,

          mimeType:
            file.mimetype,

          buffer,
        });

      return reply
        .status(201)
        .send({
          success:
            true,

          data: {
            id:
              attachment.id,

            fileName:
              attachment.fileName,

            mimeType:
              attachment.mimeType,

            size:
              attachment.size,
          },
        });
    } catch (
      error
    ) {
      return reply
        .status(400)
        .send({
          success:
            false,

          error: {
            code:
              "ATTACHMENT_UPLOAD_FAILED",

            message:
              error instanceof
              Error
                ? error.message
                : "Attachment could not be uploaded.",
          },
        });
    }
  },
);

  app.post(
    "/chat/stream",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const parsedRequest = chatSchema.safeParse(
        request.body,
      );

      if (!parsedRequest.success) {
        return reply.status(400).send({
          success: false,

          error: {
            code: "VALIDATION_ERROR",
            message:
              "Please check the submitted chat request.",
            fields:
              parsedRequest.error.flatten()
                .fieldErrors,
          },
        });
      }

      const userId = getAuthenticatedUserId(
        request.authUser,
      );

      reply.hijack();

      reply.raw.writeHead(200, {
        "Content-Type":
          "text/event-stream; charset=utf-8",
        "Cache-Control":
          "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      try {
        await executeChat(
          userId,
          parsedRequest.data,
          (event: ProgressEvent) => {
            reply.raw.write(
              createSseEvent(event),
            );
          },
        );
      } catch (error) {
        reply.raw.write(
          createSseEvent({
            type: "analysis.failed",
            message:
              error instanceof Error
                ? error.message
                : "Unknown analysis error",
          }),
        );
      } finally {
        reply.raw.end();
      }
    },
  );

  app.get(
    "/conversations",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const userId = getAuthenticatedUserId(
        request.authUser,
      );

      const conversations =
        await conversationRepository.list(
          userId,
        );

      return reply.status(200).send({
        success: true,
        data: conversations,
      });
    },
  );

  app.get(
    "/conversations/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const parsedParams =
        conversationParamsSchema.safeParse(
          request.params,
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          success: false,

          error: {
            code: "INVALID_CONVERSATION_ID",
            message:
              "Conversation ID is invalid.",
          },
        });
      }

      const userId = getAuthenticatedUserId(
        request.authUser,
      );

      const conversation =
        await conversationRepository.get(
          userId,
          parsedParams.data.id,
        );

      if (!conversation) {
        return reply.status(404).send({
          success: false,

          error: {
            code: "CONVERSATION_NOT_FOUND",
            message:
              "Conversation could not be found.",
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: conversation,
      });
    },
  );

  app.delete(
    "/conversations/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const parsedParams =
        conversationParamsSchema.safeParse(
          request.params,
        );

      if (!parsedParams.success) {
        return reply.status(400).send({
          success: false,

          error: {
            code: "INVALID_CONVERSATION_ID",
            message:
              "Conversation ID is invalid.",
          },
        });
      }

      const userId = getAuthenticatedUserId(
        request.authUser,
      );

      const deleted =
        await conversationRepository.delete(
          userId,
          parsedParams.data.id,
        );

      if (!deleted) {
        return reply.status(404).send({
          success: false,

          error: {
            code: "CONVERSATION_NOT_FOUND",
            message:
              "Conversation could not be found.",
          },
        });
      }

      return reply.status(204).send();
    },
  );
};