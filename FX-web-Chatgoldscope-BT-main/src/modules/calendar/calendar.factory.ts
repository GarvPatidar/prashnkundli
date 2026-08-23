import { env } from "../../config.js";
import type { CalendarProvider } from "./calendar.provider.js";
import { MockCalendarProvider } from "./mock-calendar.provider.js";
import { TradingEconomicsCalendarProvider } from "./trading-economics-calendar.provider.js";

function createCalendarProvider(): CalendarProvider {
  switch (env.CALENDAR_PROVIDER) {
    case "mock":
      return new MockCalendarProvider();

    case "trading-economics":
      return new TradingEconomicsCalendarProvider(
        env.TRADING_ECONOMICS_API_KEY!,
        env.TRADING_ECONOMICS_BASE_URL,
      );
  }
}

export const calendarProvider =
  createCalendarProvider();