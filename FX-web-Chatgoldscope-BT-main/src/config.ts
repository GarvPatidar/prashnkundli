import "dotenv/config";

import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum([
        "development",
        "test",
        "production",
      ])
      .default("development"),

    PORT: z.coerce
      .number()
      .int()
      .positive()
      .default(4000),

    HOST: z
      .string()
      .trim()
      .min(1)
      .default("0.0.0.0"),

    FRONTEND_ORIGIN: z
      .string()
      .url()
      .default("http://localhost:3000"),

    DATABASE_URL: z
      .string()
      .trim()
      .min(
        1,
        "DATABASE_URL is required.",
      ),

    /*
     * AI
     */
    AI_PROVIDER: z
      .enum([
        "mock",
        "openai",
      ])
      .default("mock"),

    OPENAI_API_KEY: optionalString,

    OPENAI_MODEL: optionalString,

    /*
     * MARKET DATA
     */
   MARKET_PROVIDER: z
      .enum([
        "mock",
        "twelve-data",
      ])
      .default("twelve-data"),

    TWELVE_DATA_API_KEY:
      optionalString,

    /*
     * Your Twelve Data plan's credits per minute minus a safety
     * margin. Free plan = 8 -> use 7. Grow 55+ -> e.g. 50.
     */
    TWELVE_DATA_CREDITS_PER_MINUTE: z.coerce
      .number()
      .int()
      .positive()
      .default(7),

    TWELVE_DATA_BASE_URL: z
      .string()
      .url()
      .default(
        "https://api.twelvedata.com",
      ),

    /*
     * ECONOMIC CALENDAR
     */
    CALENDAR_PROVIDER: z
      .enum([
        "mock",
        "trading-economics",
      ])
      .default("mock"),

    /*
     * NEWS
     *
     * Kept separate from CALENDAR_PROVIDER
     * intentionally. This allows GoldScope
     * to use Trading Economics for calendar
     * and a different news provider later.
     */
    NEWS_PROVIDER: z
      .enum([
        "mock",
        "trading-economics",
      ])
      .default("mock"),

    /*
     * Trading Economics credentials may be
     * shared by both calendar and news.
     */
    TRADING_ECONOMICS_API_KEY:
      optionalString,

    TRADING_ECONOMICS_BASE_URL: z
      .string()
      .url()
      .default(
        "https://api.tradingeconomics.com",
      ),

    /*
     * STORAGE
     */
    STORAGE_PROVIDER: z
      .enum([
        "local",
        "r2",
      ])
      .default("local"),

    CLOUDFLARE_R2_ACCOUNT_ID:
      optionalString,

    CLOUDFLARE_R2_ACCESS_KEY_ID:
      optionalString,

    CLOUDFLARE_R2_SECRET_ACCESS_KEY:
      optionalString,

    CLOUDFLARE_R2_BUCKET:
      optionalString,

    CLOUDFLARE_R2_PUBLIC_URL:
      optionalString,

    /*
     * CHAT / ANALYSIS
     */
    MAX_SCREENSHOT_SIZE_MB: z.coerce
      .number()
      .positive()
      .default(8),

    /*
     * AUTH
     */
    JWT_ACCESS_SECRET:
      optionalString,

    JWT_REFRESH_SECRET:
      optionalString,

    ACCESS_TOKEN_EXPIRES_IN: z
      .string()
      .trim()
      .default("15m"),

    REFRESH_TOKEN_EXPIRES_IN: z
      .string()
      .trim()
      .default("30d"),

    /*
     * OTP
     */
    OTP_PROVIDER: z
      .enum([
        "mock",
        "whatsapp",
      ])
      .default("mock"),

    WHATSAPP_API_TOKEN:
      optionalString,

    WHATSAPP_PHONE_NUMBER_ID:
      optionalString,

    WHATSAPP_TEMPLATE_NAME:
      optionalString,

    /*
     * ACCOUNT ACTIVATION / DEPLOYMENT
     *
     * AUTO_ACTIVATE_USERS: when unset it defaults to true only
     * while OTP_PROVIDER=mock. Set it to "false" in production
     * so new accounts must verify their phone.
     */
    AUTO_ACTIVATE_USERS: z
      .enum(["true", "false"])
      .optional(),

    /* Set to "true" behind Render / Vercel / nginx proxies. */
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false"),

    /* Extra allowed browser origins, comma separated. */
    CORS_ORIGINS: optionalString,

    /*
     * RATE LIMIT
     */
    RATE_LIMIT_MAX_REQUESTS:
      z.coerce
        .number()
        .int()
        .positive()
        .default(100),

    RATE_LIMIT_WINDOW: z
      .string()
      .trim()
      .default("1 minute"),
  })

const parsedEnvironment =
  environmentSchema.safeParse(
    process.env,
  );

if (!parsedEnvironment.success) {
  console.error(
    "Invalid backend environment configuration:",
    parsedEnvironment.error.flatten()
      .fieldErrors,
  );

  throw new Error(
    "Backend environment validation failed. Check the .env file.",
  );
}

const parsedData =
  parsedEnvironment.data;

if (parsedData.NODE_ENV === "production") {
  const weakSecrets = [
    ["JWT_ACCESS_SECRET", parsedData.JWT_ACCESS_SECRET],
  ].filter(
    ([, value]) =>
      !value || String(value).length < 32,
  );

  if (weakSecrets.length > 0) {
    throw new Error(
      `Production requires strong secrets (min 32 chars): ${weakSecrets
        .map(([name]) => name)
        .join(", ")}`,
    );
  }

  if (parsedData.OTP_PROVIDER === "mock") {
    console.warn(
      "[config] OTP_PROVIDER=mock in production. Set a real OTP provider and AUTO_ACTIVATE_USERS=false.",
    );
  }
}

export const env = {
  ...parsedData,

  AUTO_ACTIVATE_USERS:
    parsedData.AUTO_ACTIVATE_USERS !== undefined
      ? parsedData.AUTO_ACTIVATE_USERS === "true"
      : parsedData.OTP_PROVIDER === "mock",

  TRUST_PROXY:
    parsedData.TRUST_PROXY === "true",

  CORS_ORIGINS_LIST: (
    parsedData.CORS_ORIGINS ?? ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export type Environment =
  typeof env;
