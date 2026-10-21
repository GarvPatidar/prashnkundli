"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

interface Stats {
  days: number;
  issued: number;
  open: number;
  notTriggered: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number | null;
  totalR: number;
  avgR: number | null;
  sampleIsSmall: boolean;
  recent: Array<{
    id: string;
    createdAt: string;
    direction: "BUY" | "SELL";
    conviction: string;
    entry: number;
    stopLoss: number;
    tp1: number;
    status: string;
    resultR: number | null;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Waiting for entry",
  ACTIVE: "Running",
  TP1_HIT: "Target hit",
  STOPPED: "Stopped out",
  EXPIRED: "Entry never reached",
  TIMEOUT: "Closed on time limit",
};

export default function Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/v1/signals/stats?days=90`)
      .then((r) => r.json())
      .then((json) => setStats(json.data as Stats))
      .catch(() => setFailed(true));
  }, []);

  const tile = (label: string, value: string) => (
    <div className="surface p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--text)]">{value}</p>
    </div>
  );

  return (
    <div className="overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="surface p-6">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Track record</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Every BUY/SELL plan GoldScope issued in the last 90 days, followed against real
            15-minute candles. Wins, losses and plans that never triggered are all counted.
            If one candle touches both stop and target, it counts as a loss. Past results do
            not guarantee future results.
          </p>
        </div>

        {failed ? (
          <p className="text-sm text-[var(--danger)]">Track record could not be loaded.</p>
        ) : null}

        {stats ? (
          <>
            {stats.sampleIsSmall ? (
              <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                Early data: fewer than 30 completed plans so far. Treat these numbers as a
                preview, not proof.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {tile("Plans issued", String(stats.issued))}
              {tile("Win rate (wins vs stops)", stats.winRate === null ? "n/a" : `${stats.winRate}%`)}
              {tile("Total result", `${stats.totalR > 0 ? "+" : ""}${stats.totalR} R`)}
              {tile("Avg per trade", stats.avgR === null ? "n/a" : `${stats.avgR} R`)}
              {tile("Targets hit", String(stats.wins))}
              {tile("Stopped out", String(stats.losses))}
              {tile("Never triggered", String(stats.notTriggered))}
              {tile("Still open", String(stats.open))}
            </div>

            <div className="surface overflow-x-auto p-2">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-[var(--text-muted)]">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Side</th>
                    <th className="p-2">Entry</th>
                    <th className="p-2">Stop</th>
                    <th className="p-2">Target</th>
                    <th className="p-2">Outcome</th>
                    <th className="p-2">R</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((s) => (
                    <tr key={s.id} className="border-t border-[var(--border)]">
                      <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="p-2 font-semibold">{s.direction}</td>
                      <td className="p-2">{s.entry.toFixed(2)}</td>
                      <td className="p-2">{s.stopLoss.toFixed(2)}</td>
                      <td className="p-2">{s.tp1.toFixed(2)}</td>
                      <td className="p-2">{STATUS_LABEL[s.status] ?? s.status}</td>
                      <td className="p-2">{s.resultR === null ? "-" : s.resultR}</td>
                    </tr>
                  ))}
                  {stats.recent.length === 0 ? (
                    <tr>
                      <td className="p-4 text-[var(--text-muted)]" colSpan={7}>
                        No plans logged yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
