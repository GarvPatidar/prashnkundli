import type { NewsProvider } from "./news.provider.js";
import type {
  EconomicEvent,
  NewsContext,
  NewsHeadline,
  NewsImpact,
} from "./news.types.js";

const HIGH_IMPACT_WINDOW_MINUTES = 45;

function getMinutesDifference(
  from: Date,
  to: Date,
): number {
  return Math.round(
    (to.getTime() - from.getTime()) /
      60_000,
  );
}

function sortEvents(
  events: readonly EconomicEvent[],
): EconomicEvent[] {
  return [...events].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() -
      new Date(b.scheduledAt).getTime(),
  );
}

function sortHeadlines(
  headlines: readonly NewsHeadline[],
): NewsHeadline[] {
  return [...headlines].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() -
      new Date(a.publishedAt).getTime(),
  );
}

function getOverallImpact(
  events: readonly EconomicEvent[],
  headlines: readonly NewsHeadline[],
): NewsImpact {
  const hasHigh =
    events.some(
      (event) => event.impact === "HIGH",
    ) ||
    headlines.some(
      (headline) =>
        headline.impact === "HIGH",
    );

  if (hasHigh) {
    return "HIGH";
  }

  const hasMedium =
    events.some(
      (event) => event.impact === "MEDIUM",
    ) ||
    headlines.some(
      (headline) =>
        headline.impact === "MEDIUM",
    );

  return hasMedium
    ? "MEDIUM"
    : "LOW";
}

export class NewsService {
  constructor(
    private readonly provider: NewsProvider,
  ) {}

  async getContext(
    now: Date = new Date(),
  ): Promise<NewsContext> {
    const [events, headlines] =
      await Promise.all([
        this.provider.getEconomicEvents(),
        this.provider.getHeadlines(),
      ]);

    const sortedEvents =
      sortEvents(events);

    const sortedHeadlines =
      sortHeadlines(headlines);

    const futureHighImpactEvents =
      sortedEvents.filter(
        (event) =>
          event.impact === "HIGH" &&
          new Date(
            event.scheduledAt,
          ).getTime() >= now.getTime(),
      );

    const nextHighImpactEvent =
      futureHighImpactEvents[0] ?? null;

    const minutesToNextHighImpactEvent =
      nextHighImpactEvent
        ? getMinutesDifference(
            now,
            new Date(
              nextHighImpactEvent.scheduledAt,
            ),
          )
        : null;

    const highImpactEventsNext24h =
      futureHighImpactEvents.filter(
        (event) => {
          const minutes =
            getMinutesDifference(
              now,
              new Date(
                event.scheduledAt,
              ),
            );

          return (
            minutes >= 0 &&
            minutes <= 24 * 60
          );
        },
      );

    const newsRiskWindow =
      minutesToNextHighImpactEvent !== null &&
      minutesToNextHighImpactEvent >= 0 &&
      minutesToNextHighImpactEvent <=
        HIGH_IMPACT_WINDOW_MINUTES;

    const warnings: string[] = [];

    if (newsRiskWindow) {
      warnings.push(
        "A high-impact economic event is approaching.",
      );
    }

    if (
      highImpactEventsNext24h.length >= 3
    ) {
      warnings.push(
        "Multiple high-impact economic events are scheduled within the next 24 hours.",
      );
    }

    return {
      nextHighImpactEvent,
      highImpactEventsNext24h,
      recentHeadlines:
        sortedHeadlines.slice(0, 20),
      newsRiskWindow,
      minutesToNextHighImpactEvent,
      overallImpact:
        getOverallImpact(
          sortedEvents,
          sortedHeadlines,
        ),
      warnings,
      generatedAt: now.toISOString(),
    };
  }
}