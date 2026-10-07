import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { executeChat } from "./chat.service.js";
import { requireAuth } from "./modules/auth/auth.middleware.js";
import { marketProvider } from "./providers.js";
import { env } from "./config.js";
import { candleProvider } from "./modules/market/candle.factory.js";
import { getMarketBias } from "./modules/analysis/market-bias.service.js";
import { sessionService } from "./modules/sessions/session.service.js";
import { twelveDataBudget } from "./modules/market/twelve-data-budget.js";
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

  /*
   * DEV ONLY. Compares the live quote with the latest candle of
   * every timeframe so price mismatches (header price vs the
   * "daily close" the AI quotes) can be diagnosed in one look.
   */
  if (env.NODE_ENV !== "production") {
    app.get("/market/debug", async () => {
      const snapshot = await marketProvider.getSnapshot();
      const livePrice = snapshot.quote.price;

      const timeframes = ["M15", "H1", "H4", "D1"] as const;

      const candles = await Promise.all(
        timeframes.map(async (timeframe) => {
          try {
            const series = await candleProvider.getCandles({
              symbol: "XAUUSD",
              timeframe,
              /* Same limit as the analysis, so this is a cache hit. */
              limit: 300,
            });

            const last = series[series.length - 1];

            if (!last) {
              return { timeframe, error: "No candles returned." };
            }

            const diff = last.close - livePrice;

            return {
              timeframe,
              lastCandleAt: last.timestamp,
              open: last.open,
              high: last.high,
              low: last.low,
              close: last.close,
              diffFromLivePrice: Number(diff.toFixed(2)),
              diffPercent: Number(
                ((diff / livePrice) * 100).toFixed(2),
              ),
            };
          } catch (error) {
            return {
              timeframe,
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            };
          }
        }),
      );

      return {
        livePrice,
        quoteProvider: snapshot.quote.provider,
        quoteTimestamp: snapshot.quote.timestamp,
        serverTime: new Date().toISOString(),
        candles,
        howToRead:
          "All closes should be within ~0.5% of livePrice. A large gap means one data source is stale or wrong.",
      };
    });
  }

  app.get("/market/snapshot", async (request, reply) => {
    /*
     * Quote and bias are loaded independently so a bias
     * failure never hides the live price.
     */
    let snapshot;
    let bias;

    try {
      [snapshot, bias] = await Promise.all([
        marketProvider.getSnapshot(),
        getMarketBias(),
      ]);
    } catch (error) {
      request.log.warn(
        { err: error },
        "Live market snapshot unavailable.",
      );

      return reply.status(503).send({
        success: false,
        error: {
          code: "MARKET_DATA_UNAVAILABLE",
          message: twelveDataBudget.isDailyLimitReached()
            ? "Live market data is paused because the data provider's daily limit was reached. It resumes automatically after the daily reset."
            : "Live market data is temporarily unavailable. Please try again shortly.",
        },
      });
    }

    const tradingSession =
      sessionService.getContext();

    return {
      success: true,
      data: {
        ...snapshot,
        bias,
        tradingSession: {
          name: tradingSession.session,
          liquidity: tradingSession.liquidity,
          isOverlap: tradingSession.isOverlap,
          minutesUntilNextChange:
            tradingSession.minutesUntilNextSessionChange,
        },
      },
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

      /*
       * hijack() skips Fastify's normal reply pipeline, so the
       * CORS headers set by @fastify/cors must be copied
       * manually or browsers block the stream cross-origin.
       */
      const inheritedHeaders = Object.fromEntries(
        Object.entries(reply.getHeaders()).filter(
          ([, value]) => value !== undefined,
        ),
      ) as Record<string, string | number | string[]>;

      reply.raw.writeHead(200, {
        ...inheritedHeaders,
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
              "The analysis could not be completed. Please try again.",
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