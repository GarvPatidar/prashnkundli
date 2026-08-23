import type { CalendarContext } from "../../types.js";
import type { CalendarProvider } from "./calendar.provider.js";

export class MockCalendarProvider
  implements CalendarProvider
{
  async getContext(): Promise<CalendarContext> {
    return {
      nextHighImpactEvent: null,
      newsRiskWindow: false,
      generatedAt: new Date().toISOString(),
    };
  }
}