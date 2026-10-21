import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { prisma } from "../../prisma.js";
import { requireAuth } from "../auth/auth.middleware.js";

const openSchema = z.object({
  direction: z.enum(["BUY", "SELL"]),
  entry: z.number().positive(),
  stopLoss: z.number().positive().nullable().optional(),
  takeProfit: z.number().positive().nullable().optional(),
  lots: z.number().positive().max(1000).nullable().optional(),
  signalId: z.string().min(1).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

const closeSchema = z.object({
  exitPrice: z.number().positive(),
  note: z.string().trim().max(1000).nullable().optional(),
});

const idSchema = z.object({ id: z.string().min(1) });

function uid(request: { authUser?: { userId: string } | undefined }): string {
  if (!request.authUser) {
    throw new Error("Authenticated user context is missing.");
  }

  return request.authUser.userId;
}

const bad = (message: string) => ({
  success: false,
  error: { code: "VALIDATION_ERROR", message },
});

export const journalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/", async (request, reply) => {
    const userId = uid(request);

    const trades = await prisma.journalTrade.findMany({
      where: { userId },
      orderBy: { openedAt: "desc" },
      take: 200,
    });

    const closed = trades.filter((t) => t.status === "CLOSED");
    const wins = closed.filter((t) => (t.pnlPoints ?? 0) > 0);
    const totalPoints = closed.reduce((s, t) => s + (t.pnlPoints ?? 0), 0);

    return reply.send({
      success: true,
      data: {
        trades,
        stats: {
          open: trades.length - closed.length,
          closed: closed.length,
          winRate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : null,
          totalPoints: Math.round(totalPoints * 100) / 100,
        },
      },
    });
  });

  app.post("/", async (request, reply) => {
    const parsed = openSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send(bad("Please check the trade details."));
    }

    const d = parsed.data;
    const buy = d.direction === "BUY";

    if (d.stopLoss != null && (buy ? d.stopLoss >= d.entry : d.stopLoss <= d.entry)) {
      return reply.status(400).send(bad("Stop loss is on the wrong side of the entry."));
    }

    const trade = await prisma.journalTrade.create({
      data: {
        userId: uid(request),
        direction: d.direction,
        entry: d.entry,
        stopLoss: d.stopLoss ?? null,
        takeProfit: d.takeProfit ?? null,
        lots: d.lots ?? null,
        signalId: d.signalId ?? null,
        note: d.note ?? null,
      },
    });

    return reply.status(201).send({ success: true, data: trade });
  });

  app.patch("/:id/close", async (request, reply) => {
    const params = idSchema.safeParse(request.params);
    const parsed = closeSchema.safeParse(request.body);

    if (!params.success || !parsed.success) {
      return reply.status(400).send(bad("Please enter the exit price."));
    }

    const userId = uid(request);

    const trade = await prisma.journalTrade.findFirst({
      where: { id: params.data.id, userId },
    });

    if (!trade) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Trade not found." },
      });
    }

    const move =
      trade.direction === "BUY"
        ? parsed.data.exitPrice - trade.entry
        : trade.entry - parsed.data.exitPrice;

    const updated = await prisma.journalTrade.update({
      where: { id: trade.id },
      data: {
        status: "CLOSED",
        exitPrice: parsed.data.exitPrice,
        pnlPoints: Math.round(move * 100) / 100,
        closedAt: new Date(),
        ...(parsed.data.note ? { note: parsed.data.note } : {}),
      },
    });

    return reply.send({ success: true, data: updated });
  });

  app.delete("/:id", async (request, reply) => {
    const params = idSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send(bad("Invalid trade id."));
    }

    await prisma.journalTrade.deleteMany({
      where: { id: params.data.id, userId: uid(request) },
    });

    return reply.send({ success: true });
  });
};
