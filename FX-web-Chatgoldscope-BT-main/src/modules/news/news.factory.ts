import { env } from "../../config.js";

import { MockNewsProvider } from "./mock-news.provider.js";
import type { NewsProvider } from "./news.provider.js";
import { NewsService } from "./news.service.js";
import { TradingEconomicsNewsProvider } from "./trading-economics-news.provider.js";

function createNewsProvider(): NewsProvider {
  switch (env.NEWS_PROVIDER) {
    case "mock":
      return new MockNewsProvider();

    case "trading-economics":
      return new TradingEconomicsNewsProvider(
        env.TRADING_ECONOMICS_API_KEY!,
        env.TRADING_ECONOMICS_BASE_URL,
      );
  }
}

export const newsProvider =
  createNewsProvider();

export const newsService =
  new NewsService(
    newsProvider,
  );