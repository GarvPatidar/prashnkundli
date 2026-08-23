import type { MarketSnapshot } from "../../types.js";

export interface MarketProvider {
  getSnapshot(): Promise<MarketSnapshot>;
}