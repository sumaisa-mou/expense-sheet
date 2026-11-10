"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/client";
import { todayISO } from "@/lib/field-types";
import type { LoanData } from "@/lib/loan";
import {
  formatDisplayDate,
  getMonthLabel,
  getMonthYearKey,
  parseDateString,
} from "@/lib/helpers/transactions";

const CARD =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900";
const CONTROL =
  "w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-950 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

function money(value: number | null, decimals = true): string {
  if (value === null) return "—";
  const abs = Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `${value < 0 ? "-" : ""}৳${abs}`;
}

function monthlyTotals(entries: LoanData["entries"]) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const d = parseDateString(e.date);
    if (!d) continue;
    const key = getMonthYearKey(d);
    totals.set(key, (totals.get(key) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({ key, total }));
}

function MonthlyChart({ entries }: { entries: LoanData["entries"] }) {
  const months = useMemo(() => monthlyTotals(entries).slice(-18), [entries]);
  if (months.length === 0) return null;

  const max = Math.max(...months.map((m) => m.total), 0);
  const min = Math.min(...months.map((m) => m.total), 0);
  const range = max - min || 1;
  const H = 120;
  const zeroY = (max / range) * H;
  const barW = 100 / months.length;

  return (
    <div className={CARD}>
      <h2 className="mb-1 text-sm font-semibold">Monthly total</h2>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Last {months.length} months · blue = repaid, red = negative
      </p>
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label="Monthly repayment totals"
      >
        <line x1="0" x2="100" y1={zeroY} y2={zeroY} className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="0.3" />
        {months.map((m, i) => {
          const h = (Math.abs(m.total) / range) * H;
          const y = m.total >= 0 ? zeroY - h : zeroY;
          return (
            <rect
              key={m.key}
              x={i * barW + barW * 0.15}
              y={y}
              width={barW * 0.7}
              height={Math.max(h, 0.5)}
              rx="0.4"
              className={m.total >= 0 ? "fill-sky-600" : "fill-rose-500"}
            >
              <title>{`${getMonthLabel(m.key)}: ${money(m.total)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{getMonthLabel(months[0].key)}</span>
        <span>{getMonthLabel(months[months.length - 1].key)}</span>
      </div>
    </div>
  );
}

export default function LoanApp() {
  const [data, setData] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [negative, setNegative] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchJson<LoanData>("/api/loan"));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Math.abs(Number(amount));
    if (!value) {
      setError("Enter an amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson("/api/loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description,
          amount: negative ? -value : value,
        }),
      });
      setNotice("Entry added.");
      setDescription("");
      setAmount("");
      setNegative(false);
      setDate(todayISO());
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const summary = data?.summary;
  const recent = useMemo(() => [...(data?.entries ?? [])].reverse().slice(0, 15), [data]);

  return (
    <main className="flex-1 pb-10">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          ✓ {notice}
        </div>
      ) : null}

      {/* Headline: how much is remaining */}
      <section className="mb-5 rounded-2xl bg-zinc-900 p-6 text-white shadow-sm dark:bg-white dark:text-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">
          {summary?.remainingLabel ?? "Remaining"}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
          {loading && !data ? "…" : money(summary?.remaining ?? null)}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          {[
            ["Total repaid", summary?.totalRepayment ?? null],
            ["Paid in", summary?.positive ?? null],
            ["Adjustments", summary?.negative ?? null],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-[11px] opacity-60">{label as string}</p>
              <p className="font-semibold tabular-nums">{money(value as number | null, false)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <form onSubmit={submit} className={`${CARD} space-y-4 lg:col-span-5`}>
          <h2 className="text-sm font-semibold">New entry</h2>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={CONTROL} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Regular, Bkash"
              className={CONTROL}
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Amount</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-zinc-400">
                  {negative ? "-৳" : "৳"}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${CONTROL} pl-10`}
                />
              </div>
              <button
                type="button"
                onClick={() => setNegative((n) => !n)}
                aria-pressed={negative}
                className={`rounded-xl border px-3.5 text-sm font-medium transition ${
                  negative
                    ? "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {negative ? "Negative" : "Positive"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {submitting ? "Adding…" : "Add entry"}
          </button>
        </form>

        <div className="space-y-5 lg:col-span-7">
          <MonthlyChart entries={data?.entries ?? []} />

          <section className={CARD}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent entries</h2>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                {loading ? "Loading…" : "No entries yet."}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.rowNumber} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-2 pr-3 text-xs sm:text-sm">{formatDisplayDate(e.date)}</td>
                      <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">{e.description}</td>
                      <td
                        className={`py-2 text-right font-medium tabular-nums ${
                          e.amount < 0 ? "text-rose-600 dark:text-rose-400" : ""
                        }`}
                      >
                        {money(e.amount, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
