"use client";

import { useCallback, useEffect, useState } from "react";

import { authenticatedFetch } from "@/features/auth/auth.api";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

interface Trade {
  id: string;
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  lots: number | null;
  status: "OPEN" | "CLOSED";
  exitPrice: number | null;
  pnlPoints: number | null;
  note: string | null;
  openedAt: string;
}

interface JournalData {
  trades: Trade[];
  stats: { open: number; closed: number; winRate: number | null; totalPoints: number };
}

const num = (value: string): number | null => {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const input =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)]";

export default function Page() {
  const [data, setData] = useState<JournalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    direction: "BUY",
    entry: "",
    stopLoss: "",
    takeProfit: "",
    lots: "",
    note: "",
  });
  const [closing, setClosing] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/v1/journal`);
      const json = await response.json();
      setData(json.data as JournalData);
    } catch {
      setError("Journal could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const call = async (path: string, method: string, body?: unknown) => {
    setError(null);

    const response = await authenticatedFetch(`${API_BASE_URL}/v1/journal${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      setError(json?.error?.message ?? "Request failed.");
      return false;
    }

    await load();
    return true;
  };

  return (
    <div className="overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="surface p-6">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Trade journal</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Log the trades you actually take and close them with the exit price. Results are
            in gold points (price difference), so they do not depend on lot size.
          </p>
        </div>

        {data ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Open", String(data.stats.open)],
              ["Closed", String(data.stats.closed)],
              ["Win rate", data.stats.winRate === null ? "n/a" : `${data.stats.winRate}%`],
              ["Total points", String(data.stats.totalPoints)],
            ].map(([label, value]) => (
              <div key={label} className="surface p-4">
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--text)]">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <form
          className="surface grid gap-3 p-5 md:grid-cols-6"
          onSubmit={async (event) => {
            event.preventDefault();
            const entry = num(form.entry);

            if (entry === null) {
              setError("Enter a valid entry price.");
              return;
            }

            const ok = await call("", "POST", {
              direction: form.direction,
              entry,
              stopLoss: num(form.stopLoss),
              takeProfit: num(form.takeProfit),
              lots: num(form.lots),
              note: form.note.trim() || null,
            });

            if (ok) {
              setForm({ direction: form.direction, entry: "", stopLoss: "", takeProfit: "", lots: "", note: "" });
            }
          }}
        >
          <select
            className={input}
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          {(["entry", "stopLoss", "takeProfit", "lots"] as const).map((key) => (
            <input
              key={key}
              className={input}
              inputMode="decimal"
              placeholder={
                { entry: "Entry", stopLoss: "Stop loss", takeProfit: "Target", lots: "Lots" }[key]
              }
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Add trade
          </button>
          <input
            className={`${input} md:col-span-6`}
            placeholder="Note (why did you take it?)"
            maxLength={1000}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </form>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="space-y-2">
          {data?.trades.map((t) => (
            <div key={t.id} className="surface flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="font-semibold">{t.direction}</span>
              <span>Entry {t.entry}</span>
              {t.stopLoss ? <span>SL {t.stopLoss}</span> : null}
              {t.takeProfit ? <span>TP {t.takeProfit}</span> : null}
              {t.lots ? <span>{t.lots} lots</span> : null}
              {t.note ? <span className="text-[var(--text-muted)]">{t.note}</span> : null}
              <span className="ml-auto flex items-center gap-2">
                {t.status === "CLOSED" ? (
                  <strong className={(t.pnlPoints ?? 0) >= 0 ? "text-green-600" : "text-[var(--danger)]"}>
                    {(t.pnlPoints ?? 0) >= 0 ? "+" : ""}
                    {t.pnlPoints} pts (exit {t.exitPrice})
                  </strong>
                ) : (
                  <>
                    <input
                      className={`${input} w-28`}
                      inputMode="decimal"
                      placeholder="Exit price"
                      value={closing[t.id] ?? ""}
                      onChange={(e) => setClosing({ ...closing, [t.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold"
                      onClick={() => {
                        const exitPrice = num(closing[t.id] ?? "");
                        if (exitPrice === null) {
                          setError("Enter a valid exit price.");
                          return;
                        }
                        void call(`/${t.id}/close`, "PATCH", { exitPrice });
                      }}
                    >
                      Close
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label="Delete trade"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                  onClick={() => void call(`/${t.id}`, "DELETE")}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
          {data && data.trades.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No trades yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
