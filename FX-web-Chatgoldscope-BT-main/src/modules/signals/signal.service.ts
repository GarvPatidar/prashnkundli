import { prisma } from "../../prisma.js";
import type { MarketIntelligenceResult } from "../analysis/market-intelligence.service.js";
import { activeBlackout } from "../calendar/static-calendar.js";
import { decide } from "../decision/decision.service.js";
import type { Candle } from "../indicators/indicator.types.js";
import { evaluateSignal } from "./signal-tracker.js";

/**
 * Every BUY/SELL the engine would show a user is logged here (INTRADAY view,
 * once per direction per H1 candle) and followed against real M15 candles.
 * This is the public track record: wins, losses and misses, nothing hidden.
 */

const EXPIRY_MS = 4 * 60 * 60_000;
const MAX_HOLD_MS = 24 * 60 * 60_000;
const OPEN_STATUSES = ["PENDING", "ACTIVE"] as const;

let busy = false;

export async function recordAndTrack(
  result: MarketIntelligenceResult,
  m15: Candle[],
  now: Date = new Date(),
): Promise<void> {
  if (busy) {
    return;
  }

  busy = true;

  try {
    const decision = decide({
      result,
      horizon: "INTRADAY",
      stabilize: true,
      now,
      newsBlackout: activeBlackout(now),
    });

    const plan = decision.plan;

    if (
      (decision.action === "BUY" || decision.action === "SELL") &&
      plan &&
      !decision.marketClosed
    ) {
      const open = await prisma.signal.findFirst({
        where: {
          direction: decision.action,
          horizon: decision.horizon,
          status: { in: [...OPEN_STATUSES] },
        },
        select: { id: true },
      });

      if (!open) {
        const rr = plan.riskReward[0] ?? 0;

        await prisma.signal
          .create({
            data: {
              horizon: decision.horizon,
              direction: decision.action,
              conviction: decision.conviction,
              entryState: decision.entryState,
              priceAtIssue: decision.price,
              entry: plan.entry,
              stopLoss: plan.stopLoss,
              tp1: plan.targets[0] ?? plan.entry,
              tp2: plan.targets[1] ?? null,
              riskReward1: rr,
              expiresAt: new Date(now.getTime() + EXPIRY_MS),
              maxHoldUntil: new Date(now.getTime() + MAX_HOLD_MS),
              dedupeKey: `${decision.horizon}|${decision.action}|${decision.validUntil}`,
            },
          })
          .catch(() => undefined); /* duplicate key = already logged this hour */
      }
    }

    const open = await prisma.signal.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
    });

    for (const signal of open) {
      const update = evaluateSignal(
        {
          direction: signal.direction,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          tp1: signal.tp1,
          tp2: signal.tp2,
          riskReward1: signal.riskReward1,
          createdAt: signal.createdAt,
          expiresAt: signal.expiresAt,
          maxHoldUntil: signal.maxHoldUntil,
          status: signal.status,
          triggeredAt: signal.triggeredAt,
          tp2Hit: signal.tp2Hit,
        },
        m15,
        now,
      );

      if (update) {
        await prisma.signal.update({ where: { id: signal.id }, data: update });
      }
    }
  } catch (error) {
    console.error("[signals] record/track failed:", error);
  } finally {
    busy = false;
  }
}

export async function signalStats(days = 90) {
  const since = new Date(Date.now() - days * 86_400_000);

  const rows = await prisma.signal.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const wins = rows.filter((r) => r.status === "TP1_HIT");
  const losses = rows.filter((r) => r.status === "STOPPED");
  const timeouts = rows.filter((r) => r.status === "TIMEOUT");
  const taken = [...wins, ...losses, ...timeouts];
  const decided = wins.length + losses.length;
  const totalR = taken.reduce((sum, r) => sum + (r.resultR ?? 0), 0);

  return {
    days,
    issued: rows.length,
    open: rows.filter((r) => r.status === "PENDING" || r.status === "ACTIVE").length,
    notTriggered: rows.filter((r) => r.status === "EXPIRED").length,
    wins: wins.length,
    losses: losses.length,
    timeouts: timeouts.length,
    winRate: decided > 0 ? Math.round((wins.length / decided) * 1000) / 10 : null,
    totalR: Math.round(totalR * 100) / 100,
    avgR: taken.length > 0 ? Math.round((totalR / taken.length) * 100) / 100 : null,
    sampleIsSmall: taken.length < 30,
    recent: rows.slice(0, 30).map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      direction: r.direction,
      conviction: r.conviction,
      entry: r.entry,
      stopLoss: r.stopLoss,
      tp1: r.tp1,
      status: r.status,
      resultR: r.resultR,
      closedAt: r.closedAt,
    })),
  };
}
