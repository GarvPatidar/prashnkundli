import type { MarketSnapshot } from "../../types.js";
import type { MarketProvider } from "./market.provider.js";

export class MockMarketProvider
  implements MarketProvider
{
  async getSnapshot(): Promise<MarketSnapshot> {
    const bid = 2378.42;
    const ask = 2378.68;
    const generatedAt =
      new Date().toISOString();

    return {
      symbol: "XAUUSD",

quote: {
  price:
    Number(
      (
        (bid + ask) /
        2
      ).toFixed(2),
    ),

  bid,
  ask,

  spread:
    Number(
      (ask - bid).toFixed(2),
    ),

  provider: "Mock Feed",

  timestamp:
    generatedAt,
},

      session: {
        name: "NEW_YORK",
        highLiquidity: true,
      },

      indicators: {
        H1: {
          ema20: 2376.8,
          ema50: 2372.4,
          rsi14: 56.4,
          atr14: 3.8,
        },
      },

      levels: {
        supports: [2371.8, 2364.2],
        resistances: [2383.5, 2391.4],
      },

      generatedAt,
    };
  }
}