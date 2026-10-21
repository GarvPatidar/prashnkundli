/**
 * Free macro calendar for the four US releases that move gold the most:
 * Non-Farm Payrolls, CPI, PCE (the Fed's preferred inflation gauge) and FOMC
 * rate decisions.
 *
 * Dates come from the official schedules (BLS "Employment Situation" and
 * "CPI" release calendars, and the Federal Reserve FOMC calendar), checked on
 * 2026-10-21. PCE dates (BEA, 8:30 ET) come from two public calendars that
 * quote the BEA schedule and agree for 2026; the 2027 PCE dates come from one
 * of them only. FOMC 2027 dates are tentative until each meeting is confirmed.
 * BEA/BLS can move release dates, so re-check before each year.
 * This is NOT a full calendar: PPI, GDP, jobless claims, retail sales and Fed
 * speakers are not included, and replies must say so.
 *
 * Refresh the lists once a year, or replace this module with a live feed.
 */

export type MacroKind = "NFP" | "CPI" | "FOMC" | "PCE";

export interface MacroEvent {
  kind: MacroKind;
  name: string;
  /** UTC instant of the release. */
  at: Date;
  blackoutBeforeMin: number;
  blackoutAfterMin: number;
}

export interface NewsBlackout {
  name: string;
  phase: "BEFORE" | "AFTER";
  /** Minutes until the release (BEFORE) or since it (AFTER). */
  minutes: number;
}

export const CALENDAR_COVERS_UNTIL = "2027-12-31";
export const CALENDAR_CHECKED_ON = "2026-10-21";

const NFP_DATES = [
  "2026-11-06", "2026-12-04",
  "2027-01-08", "2027-02-05", "2027-03-05", "2027-04-02", "2027-05-07", "2027-06-04",
  "2027-07-02", "2027-08-06", "2027-09-03", "2027-10-08", "2027-11-05", "2027-12-03",
];

const CPI_DATES = [
  "2026-11-10", "2026-12-10",
  "2027-01-13", "2027-02-11", "2027-03-10", "2027-04-13", "2027-05-12", "2027-06-10",
  "2027-07-14", "2027-08-11", "2027-09-14", "2027-10-14", "2027-11-10", "2027-12-10",
];

/** PCE price index ("Personal Income and Outlays"), 8:30 am ET. */
const PCE_DATES = [
  "2026-10-29", "2026-11-25", "2026-12-23",
  "2027-01-28", "2027-02-25", "2027-03-31", "2027-04-29", "2027-05-27", "2027-06-25",
  "2027-07-29", "2027-08-25", "2027-09-30", "2027-10-28", "2027-11-24", "2027-12-22",
];

/** FOMC decision days (second day of the meeting), statement at 2:00 pm ET. */
const FOMC_DATES = [
  "2026-10-28", "2026-12-09",
  "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28", "2027-09-15",
  "2027-10-27", "2027-12-08",
];

function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return (asUtc - instant.getTime()) / 60_000;
}

/** US Eastern wall-clock time to a UTC instant, DST-aware. */
export function easternToUtc(date: string, hhmm: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = hhmm.split(":").map(Number) as [number, number];
  const local = Date.UTC(y, m - 1, d, h, mi);
  let utc = local;
  for (let i = 0; i < 2; i += 1) {
    utc = local - offsetMinutes(new Date(utc), "America/New_York") * 60_000;
  }
  return new Date(utc);
}

function build(): MacroEvent[] {
  const events: MacroEvent[] = [];
  for (const date of NFP_DATES) {
    events.push({ kind: "NFP", name: "US Non-Farm Payrolls", at: easternToUtc(date, "08:30"), blackoutBeforeMin: 60, blackoutAfterMin: 60 });
  }
  for (const date of CPI_DATES) {
    events.push({ kind: "CPI", name: "US CPI", at: easternToUtc(date, "08:30"), blackoutBeforeMin: 60, blackoutAfterMin: 60 });
  }
  for (const date of PCE_DATES) {
    events.push({ kind: "PCE", name: "US PCE inflation", at: easternToUtc(date, "08:30"), blackoutBeforeMin: 60, blackoutAfterMin: 60 });
  }
  for (const date of FOMC_DATES) {
    events.push({ kind: "FOMC", name: "FOMC rate decision", at: easternToUtc(date, "14:00"), blackoutBeforeMin: 60, blackoutAfterMin: 60 });
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export const MACRO_EVENTS: readonly MacroEvent[] = build();

export function nextMacroEvents(now: Date, count = 3): MacroEvent[] {
  return MACRO_EVENTS.filter((e) => e.at.getTime() > now.getTime()).slice(0, count);
}

/** True while the dated list still reaches beyond `now`. */
export function calendarCovers(now: Date): boolean {
  return now.getTime() <= Date.parse(`${CALENDAR_COVERS_UNTIL}T23:59:59Z`);
}

export function activeBlackout(now: Date): NewsBlackout | null {
  const t = now.getTime();
  for (const event of MACRO_EVENTS) {
    const start = event.at.getTime() - event.blackoutBeforeMin * 60_000;
    const end = event.at.getTime() + event.blackoutAfterMin * 60_000;
    if (t >= start && t <= end) {
      const diff = Math.round((event.at.getTime() - t) / 60_000);
      return diff >= 0
        ? { name: event.name, phase: "BEFORE", minutes: diff }
        : { name: event.name, phase: "AFTER", minutes: -diff };
    }
  }
  return null;
}
