import { env } from "../../config.js";
import type { CandleProvider } from "./candle.provider.js";
import { MockCandleProvider } from "./mock-candle.provider.js";
import { TwelveDataCandleProvider } from "./twelve-data-candle.provider.js";

function createCandleProvider(): CandleProvider {
  switch (env.MARKET_PROVIDER) {
    case "mock":
      return new MockCandleProvider();

    case "twelve-data":
      return new TwelveDataCandleProvider(
        env.TWELVE_DATA_API_KEY!,
        env.TWELVE_DATA_BASE_URL,
      );
  }
}

export const candleProvider =
  createCandleProvider();