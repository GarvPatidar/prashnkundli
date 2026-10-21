import { buildApp } from "./app.js";
import { env } from "./config.js";
import { marketIntelligenceOrchestrator } from "./modules/analysis/market-intelligence-orchestrator.service.js";

const app =
  buildApp();

async function startServer(): Promise<void> {
  try {
    await app.listen({
      host:
        env.HOST,

      port:
        env.PORT,
    });
  } catch (error) {
    app.log.error(
      error,
    );

    process.exit(1);
  }
}

async function shutdown(
  signal:
    string,
): Promise<void> {
  app.log.info(
    {
      signal,
    },
    "Shutting down GoldScope backend.",
  );

  try {
    await app.close();

    process.exit(0);
  } catch (error) {
    app.log.error(
      error,
    );

    process.exit(1);
  }
}

process.on(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT",
    );
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM",
    );
  },
);

/*
 * Optional background refresh so signals are logged and tracked even when
 * nobody is chatting. Each refresh costs 4 Twelve Data credits, so it is off
 * unless SIGNAL_TRACKER_INTERVAL_MIN is set (30 = ~192 credits/day).
 */
const trackerMinutes = Number(process.env.SIGNAL_TRACKER_INTERVAL_MIN ?? 0);

if (Number.isFinite(trackerMinutes) && trackerMinutes >= 5) {
  setInterval(() => {
    void marketIntelligenceOrchestrator.getLatest().catch(() => undefined);
  }, trackerMinutes * 60_000).unref();
}

void startServer();