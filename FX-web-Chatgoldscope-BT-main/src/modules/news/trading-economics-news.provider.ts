import { z } from "zod";

import type { NewsProvider } from "./news.provider.js";
import type {
  EconomicEvent,
  NewsHeadline,
  NewsImpact,
} from "./news.types.js";

const REQUEST_TIMEOUT_MS = 10_000;

const newsItemSchema = z.object({
  id: z.union([
    z.string(),
    z.number(),
  ]),

  title: z.string().min(1),

  date: z.string().min(1),

  description: z
    .string()
    .nullable()
    .optional(),

  country: z
    .string()
    .nullable()
    .optional(),

  category: z
    .string()
    .nullable()
    .optional(),

  url: z
    .string()
    .nullable()
    .optional(),

  importance: z
    .union([
      z.number(),
      z.string(),
    ])
    .nullable()
    .optional(),
});

const newsResponseSchema =
  z.array(newsItemSchema);

const calendarItemSchema = z.object({
  CalendarId: z
    .union([
      z.string(),
      z.number(),
    ])
    .optional(),

  Date: z.string().min(1),

  Country: z
    .string()
    .default("Unknown"),

  Category: z
    .string()
    .default("Economic Event"),

  Event: z
    .string()
    .nullable()
    .optional(),

  Importance: z
    .union([
      z.string(),
      z.number(),
    ])
    .nullable()
    .optional(),

  Actual: z
    .union([
      z.string(),
      z.number(),
    ])
    .nullable()
    .optional(),

  Forecast: z
    .union([
      z.string(),
      z.number(),
    ])
    .nullable()
    .optional(),

  Previous: z
    .union([
      z.string(),
      z.number(),
    ])
    .nullable()
    .optional(),

  Currency: z
    .string()
    .nullable()
    .optional(),
});

const calendarResponseSchema =
  z.array(calendarItemSchema);

function normalizeImpact(
  value:
    | string
    | number
    | null
    | undefined,
): NewsImpact {
  if (typeof value === "number") {
    if (value >= 3) {
      return "HIGH";
    }

    if (value >= 2) {
      return "MEDIUM";
    }

    return "LOW";
  }

  const normalized =
    value?.toString().trim().toLowerCase();

  if (
    normalized === "3" ||
    normalized === "high"
  ) {
    return "HIGH";
  }

  if (
    normalized === "2" ||
    normalized === "medium"
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function getGoldRelevanceScore(
  title: string,
  description: string | null,
): number {
  const content =
    `${title} ${description ?? ""}`
      .toLowerCase();

  const highWeightTerms = [
    "gold",
    "xau",
    "federal reserve",
    "fed",
    "interest rate",
    "inflation",
    "cpi",
    "pce",
    "nonfarm payroll",
    "nfp",
    "jobs report",
    "us dollar",
    "dollar index",
    "treasury yield",
  ];

  const mediumWeightTerms = [
    "geopolitical",
    "central bank",
    "recession",
    "gdp",
    "unemployment",
    "retail sales",
    "powell",
    "fomc",
  ];

  let score = 0;

  for (const term of highWeightTerms) {
    if (content.includes(term)) {
      score += 18;
    }
  }

  for (const term of mediumWeightTerms) {
    if (content.includes(term)) {
      score += 8;
    }
  }

  return Math.min(
    100,
    Math.max(0, score),
  );
}

function inferNewsImpact(
  relevanceScore: number,
): NewsImpact {
  if (relevanceScore >= 60) {
    return "HIGH";
  }

  if (relevanceScore >= 25) {
    return "MEDIUM";
  }

  return "LOW";
}

export class TradingEconomicsNewsProvider
  implements NewsProvider
{
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {
    if (!apiKey.trim()) {
      throw new Error(
        "Trading Economics API key is missing.",
      );
    }

    if (!baseUrl.trim()) {
      throw new Error(
        "Trading Economics base URL is missing.",
      );
    }
  }

  private async requestJson(
    path: string,
  ): Promise<unknown> {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(
        `${this.baseUrl}${path}`,
        {
          method: "GET",

          headers: {
            Accept: "application/json",
            Authorization:
              this.apiKey,
          },

          signal:
            controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Trading Economics request failed with status ${response.status}.`,
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getEconomicEvents(): Promise<
    EconomicEvent[]
  > {
    const rawResponse =
      await this.requestJson(
        "/calendar?importance=2,3",
      );

    const parsed =
      calendarResponseSchema.parse(
        rawResponse,
      );

    return parsed.map(
      (event, index) => ({
        id:
          event.CalendarId?.toString() ??
          `te-calendar-${index}-${event.Date}`,

        title:
          event.Event ??
          event.Category,

        country:
          event.Country,

        currency:
          event.Currency ?? null,

        impact:
          normalizeImpact(
            event.Importance,
          ),

        scheduledAt:
          new Date(
            event.Date,
          ).toISOString(),

        actual:
          event.Actual ?? null,

        forecast:
          event.Forecast ?? null,

        previous:
          event.Previous ?? null,

        source:
          "Trading Economics",
      }),
    );
  }

  async getHeadlines(): Promise<
    NewsHeadline[]
  > {
    const rawResponse =
      await this.requestJson(
        "/news?type=markets&limit=50",
      );

    const parsed =
      newsResponseSchema.parse(
        rawResponse,
      );

    return parsed
      .map((item) => {
        const description =
          item.description?.trim() ||
          null;

        const relevanceScore =
          getGoldRelevanceScore(
            item.title,
            description,
          );

        return {
          id:
            item.id.toString(),

          title:
            item.title.trim(),

          summary:
            description,

          publishedAt:
            new Date(
              item.date,
            ).toISOString(),

          source:
            item.country?.trim() ||
            item.category?.trim() ||
            "Trading Economics",

          url:
            item.url?.trim() ||
            null,

          relevanceScore,

          impact:
            inferNewsImpact(
              relevanceScore,
            ),
        } satisfies NewsHeadline;
      })
      .filter(
        (headline) =>
          headline.relevanceScore >
          0,
      )
      .sort(
        (first, second) =>
          second.relevanceScore -
          first.relevanceScore,
      )
      .slice(0, 20);
  }
}