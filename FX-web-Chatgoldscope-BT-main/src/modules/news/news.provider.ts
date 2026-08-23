import type {
  EconomicEvent,
  NewsHeadline,
} from "./news.types.js";

export interface NewsProvider {
  getEconomicEvents(): Promise<EconomicEvent[]>;
  getHeadlines(): Promise<NewsHeadline[]>;
}