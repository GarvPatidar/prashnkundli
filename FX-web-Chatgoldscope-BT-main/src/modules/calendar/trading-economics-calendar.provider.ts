import type { CalendarContext } from "../../types.js";
import type { CalendarProvider } from "./calendar.provider.js";

export class TradingEconomicsCalendarProvider
  implements CalendarProvider
{
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async getContext(): Promise<CalendarContext> {
    if (!this.apiKey.trim()) {
      throw new Error(
        "Trading Economics API key is missing.",
      );
    }

    if (!this.baseUrl.trim()) {
      throw new Error(
        "Trading Economics base URL is missing.",
      );
    }

    throw new Error(
      "Trading Economics calendar provider is configured, but its HTTP adapter has not been implemented yet.",
    );
  }
}