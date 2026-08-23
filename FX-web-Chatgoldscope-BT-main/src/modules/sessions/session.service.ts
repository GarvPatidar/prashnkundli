import type {
  MarketSession,
  MarketSessionContext,
  SessionLiquidity,
} from "./session.types.js";

interface SessionWindow {
  session: Exclude<
    MarketSession,
    "LONDON_NEW_YORK_OVERLAP" | "OFF_HOURS"
  >;
  startHourUtc: number;
  endHourUtc: number;
}

const SESSION_WINDOWS: readonly SessionWindow[] = [
  {
    session: "ASIA",
    startHourUtc: 0,
    endHourUtc: 9,
  },
  {
    session: "LONDON",
    startHourUtc: 7,
    endHourUtc: 16,
  },
  {
    session: "NEW_YORK",
    startHourUtc: 12,
    endHourUtc: 21,
  },
];

const MINUTES_PER_DAY = 24 * 60;

function toMinutes(
  hour: number,
  minute: number,
): number {
  return hour * 60 + minute;
}

function isInsideWindow(
  currentMinutes: number,
  startHourUtc: number,
  endHourUtc: number,
): boolean {
  const startMinutes =
    startHourUtc * 60;

  const endMinutes =
    endHourUtc * 60;

  return (
    currentMinutes >= startMinutes &&
    currentMinutes < endMinutes
  );
}

function getSessionWindow(
  session: SessionWindow["session"],
): SessionWindow {
  const window =
    SESSION_WINDOWS.find(
      (item) =>
        item.session === session,
    );

  if (!window) {
    throw new Error(
      `Session window configuration is missing for ${session}.`,
    );
  }

  return window;
}

function isSessionActive(
  session: SessionWindow["session"],
  currentMinutes: number,
): boolean {
  const window =
    getSessionWindow(session);

  return isInsideWindow(
    currentMinutes,
    window.startHourUtc,
    window.endHourUtc,
  );
}

function getLiquidity(
  session: MarketSession,
): SessionLiquidity {
  switch (session) {
    case "LONDON_NEW_YORK_OVERLAP":
      return "HIGH";

    case "LONDON":
    case "NEW_YORK":
      return "HIGH";

    case "ASIA":
      return "NORMAL";

    case "OFF_HOURS":
      return "LOW";
  }
}

function getWarnings(
  session: MarketSession,
): string[] {
  switch (session) {
    case "OFF_HOURS":
      return [
        "Market liquidity may be reduced during off-hours.",
      ];

    case "ASIA":
      return [
        "Asia-session liquidity can be lower than London or New York for XAU/USD.",
      ];

    case "LONDON_NEW_YORK_OVERLAP":
      return [
        "London/New York overlap can produce elevated volatility and faster price movement.",
      ];

    case "LONDON":
    case "NEW_YORK":
      return [];
  }
}

function getSessionBoundariesMinutes(): number[] {
  const boundaries = new Set<number>();

  for (const window of SESSION_WINDOWS) {
    boundaries.add(
      window.startHourUtc * 60,
    );

    boundaries.add(
      window.endHourUtc * 60,
    );
  }

  return [...boundaries].sort(
    (first, second) =>
      first - second,
  );
}

function getNextSessionBoundary(
  currentMinutes: number,
): number {
  const boundaries =
    getSessionBoundariesMinutes();

  for (const boundary of boundaries) {
    if (boundary > currentMinutes) {
      return boundary - currentMinutes;
    }
  }

  const firstBoundary =
    boundaries[0] ?? 0;

  return (
    MINUTES_PER_DAY -
    currentMinutes +
    firstBoundary
  );
}

export class SessionService {
  getContext(
    at: Date = new Date(),
  ): MarketSessionContext {
    if (
      Number.isNaN(
        at.getTime(),
      )
    ) {
      throw new Error(
        "Session context requires a valid date.",
      );
    }

    const utcHour =
      at.getUTCHours();

    const utcMinute =
      at.getUTCMinutes();

    const currentMinutes =
      toMinutes(
        utcHour,
        utcMinute,
      );

    const isAsiaSession =
      isSessionActive(
        "ASIA",
        currentMinutes,
      );

    const isLondonSession =
      isSessionActive(
        "LONDON",
        currentMinutes,
      );

    const isNewYorkSession =
      isSessionActive(
        "NEW_YORK",
        currentMinutes,
      );

    const isOverlap =
      isLondonSession &&
      isNewYorkSession;

    let session: MarketSession;

    if (isOverlap) {
      session =
        "LONDON_NEW_YORK_OVERLAP";
    } else if (isLondonSession) {
      session = "LONDON";
    } else if (isNewYorkSession) {
      session = "NEW_YORK";
    } else if (isAsiaSession) {
      session = "ASIA";
    } else {
      session = "OFF_HOURS";
    }

    return {
      session,

      liquidity:
        getLiquidity(session),

      utcHour,
      utcMinute,

      isAsiaSession,
      isLondonSession,
      isNewYorkSession,
      isOverlap,

      minutesUntilNextSessionChange:
        getNextSessionBoundary(
          currentMinutes,
        ),

      warnings:
        getWarnings(session),

      generatedAt:
        at.toISOString(),
    };
  }
}

export const sessionService =
  new SessionService();