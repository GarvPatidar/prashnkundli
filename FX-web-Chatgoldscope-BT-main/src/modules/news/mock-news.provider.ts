import type {
  EconomicEvent,
  NewsHeadline,
} from "./news.types.js";
import type { NewsProvider } from "./news.provider.js";

export class MockNewsProvider
  implements NewsProvider
{
  async getEconomicEvents(): Promise<
    EconomicEvent[]
  > {
    return [];
  }

  async getHeadlines(): Promise<
    NewsHeadline[]
  > {
    return [];
  }
}