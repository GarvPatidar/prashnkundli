export type NewsImpact =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string | null;
  impact: NewsImpact;
  scheduledAt: string;
  actual?: number | string | null;
  forecast?: number | string | null;
  previous?: number | string | null;
  source: string;
}

export interface NewsHeadline {
  id: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  source: string;
  url?: string | null;
  impact: NewsImpact;
  relevanceScore: number;
}

export interface NewsContext {
  nextHighImpactEvent: EconomicEvent | null;
  highImpactEventsNext24h: EconomicEvent[];
  recentHeadlines: NewsHeadline[];
  newsRiskWindow: boolean;
  minutesToNextHighImpactEvent: number | null;
  overallImpact: NewsImpact;
  warnings: string[];
  generatedAt: string;
}