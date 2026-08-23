import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

import Fastify, {
  type FastifyError,
  type FastifyInstance,
} from "fastify";

import { env } from "./config.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { routes } from "./routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? {
            transport: {
              target:
                "pino-pretty",

              options: {
                colorize:
                  true,

                translateTime:
                  "SYS:standard",

                ignore:
                  "pid,hostname",
              },
            },
          }
        : true,

    /*
     * Global request-body ceiling.
     *
     * Multipart also has its own explicit
     * file-size limit below.
     */
    bodyLimit:
      env.MAX_SCREENSHOT_SIZE_MB *
      1024 *
      1024,

    requestTimeout:
      60_000,
  });

  /*
   * Core security / platform plugins.
   */
  void app.register(
    helmet,
  );

  void app.register(
    cors,
    {
      origin:
        env.FRONTEND_ORIGIN,

      credentials:
        true,
    },
  );

  void app.register(
    rateLimit,
    {
      max:
        env.RATE_LIMIT_MAX_REQUESTS,

      timeWindow:
        env.RATE_LIMIT_WINDOW,
    },
  );

  /*
   * IMPORTANT:
   *
   * Multipart MUST be registered before
   * routes that call request.file().
   *
   * Without this plugin Fastify rejects
   * multipart/form-data with:
   *
   * Unsupported Media Type
   */
  void app.register(
    multipart,
    {
      limits: {
        files:
          1,

        fileSize:
          env.MAX_SCREENSHOT_SIZE_MB *
          1024 *
          1024,

        fields:
          5,
      },
    },
  );

  app.get(
    "/",
    async () => {
      return {
        success:
          true,

        service:
          "GoldScope Backend",

        version:
          "0.1.0",

        status:
          "running",

        timestamp:
          new Date()
            .toISOString(),
      };
    },
  );

  /*
   * API routes are registered only after all
   * required Fastify plugins are available.
   */
  void app.register(
    async (
      api,
    ) => {
      await api.register(
        routes,
      );

      await api.register(
        authRoutes,
        {
          prefix:
            "/auth",
        },
      );

      await api.register(
        usersRoutes,
        {
          prefix:
            "/users",
        },
      );
    },
    {
      prefix:
        "/v1",
    },
  );

  app.setErrorHandler(
    (
      error:
        FastifyError,

      request,

      reply,
    ) => {
      request.log.error(
  {
    err:
      error,

    requestId:
      request.id,
  },
  "Unhandled request error.",
);
      const statusCode =
        error.statusCode &&
        error.statusCode >=
          400 &&
        error.statusCode <
          500
          ? error.statusCode
          : 500;

      return reply
        .status(
          statusCode,
        )
        .send({
          success:
            false,

          error: {
            code:
              statusCode ===
              500
                ? "INTERNAL_SERVER_ERROR"
                : "REQUEST_ERROR",

            message:
              statusCode ===
              500
                ? "Internal server error."
                : error.message,
          },

          requestId:
            request.id,
        });
    },
  );

  app.setNotFoundHandler(
    (
      request,
      reply,
    ) => {
      return reply
        .status(404)
        .send({
          success:
            false,

          error: {
            code:
              "ROUTE_NOT_FOUND",

            message:
              `Route ${request.method}:${request.url} was not found.`,
          },

          requestId:
            request.id,
        });
    },
  );

  return app;
}