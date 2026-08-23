import { env } from "../../config.js";

import type {
  MarketProvider,
} from "./market.provider.js";

import {
  MockMarketProvider,
} from "./mock-market.provider.js";

import {
  TwelveDataMarketProvider,
} from "./twelve-data-market.provider.js";

function createMarketProvider(): MarketProvider {
  switch (env.MARKET_PROVIDER) {
    case "mock":
      return new MockMarketProvider();

    case "twelve-data":
      return new TwelveDataMarketProvider(
        env.TWELVE_DATA_API_KEY!,
        env.TWELVE_DATA_BASE_URL,
      );
  }
}

export const marketProvider =
  createMarketProvider();