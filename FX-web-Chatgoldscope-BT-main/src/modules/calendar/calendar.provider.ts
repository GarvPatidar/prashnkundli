import type { CalendarContext } from "../../types.js";

export interface CalendarProvider {
  getContext(): Promise<CalendarContext>;
}