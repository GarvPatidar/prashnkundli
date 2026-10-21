import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../prisma.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { signalStats } from "./signal.service.js";

const feedbackSchema = z.object({
  messageId: z.string().min(1),
  rating: z.enum(["UP", "DOWN"]),
  reason: z.string().trim().max(500).nullable().optional(),
});

export const signalsRoutes: FastifyPluginAsync = async (app) => {
  /* Public track record: every signal the engine issued, including losses. */
  app.get("/signals/stats", async (request, reply) => {
    const query = z
      .object({ days: z.coerce.number().int().min(1).max(365).default(90) })
      .parse(request.query);

    return reply.send({ success: true, data: await signalStats(query.days) });
  });

  app.post("/feedback", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = feedbackSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid feedback." },
      });
    }

    const userId = request.authUser?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in first." },
      });
    }

    const message = await prisma.message.findFirst({
      where: {
        id: parsed.data.messageId,
        role: "ASSISTANT",
        conversation: { userId },
      },
      select: { id: true },
    });

    if (!message) {
      return reply.status(404).send({
        success: false,
        error: { code: "MESSAGE_NOT_FOUND", message: "Message not found." },
      });
    }

    const saved = await prisma.messageFeedback.upsert({
      where: { messageId_userId: { messageId: message.id, userId } },
      create: {
        messageId: message.id,
        userId,
        rating: parsed.data.rating,
        reason: parsed.data.reason ?? null,
      },
      update: {
        rating: parsed.data.rating,
        reason: parsed.data.reason ?? null,
      },
    });

    return reply.send({
      success: true,
      data: { messageId: saved.messageId, rating: saved.rating },
    });
  });
};
