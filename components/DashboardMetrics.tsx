"use client";

import { useMemo, useState } from "react";
import {
  formatBDT,
  getCategoryStyle,
  PEOPLE,
  type Person,
} from "@/lib/field-types";
import {
  formatDisplayDate,
  withinLastDays,
  type Transaction,
} from "@/lib/helpers/transactions";

type FilterTab = "All" | Person;

type Props = {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
  error?: string | null;
};

export default function DashboardMetrics({
  transactions,
  loading,
  onRefresh,
  error,
}: Props) {
  const [personFilter, setPersonFilter] = useState<FilterTab>("All");

  // Keep only the transactions from the last 7 days
  const sevenDaysTransactions = useMemo(() => {
    return withinLastDays(transactions, 7);
  }, [transactions]);

  // Compute stats for Sunny, Mou, and Total in the 7-day window
  const sunnyTotal = useMemo(() => {
    return sevenDaysTransactions
      .filter((t) => t.person.trim().toLowerCase() === "sunny")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sevenDaysTransactions]);

  const mouTotal = useMemo(() => {
    return sevenDaysTransactions
      .filter((t) => t.person.trim().toLowerCase() === "mou")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [sevenDaysTransactions]);

  const totalSpent = useMemo(() => {
    return sevenDaysTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [sevenDaysTransactions]);

  // Filter table rows based on active tab
  const displayRows = useMemo(() => {
    if (personFilter === "All") return sevenDaysTransactions;
    return sevenDaysTransactions.filter(
      (t) => t.person.trim().toLowerCase() === personFilter.toLowerCase(),
    );
  }, [sevenDaysTransactions, personFilter]);

  // Dynamic 7-day range label (e.g. "24 Sep – 30 Sep")
  const dateRangeLabel = useMemo(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${start.getDate()} ${months[start.getMonth()]} – ${today.getDate()} ${months[today.getMonth()]}`;
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 transition-all">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Last 7 Days (Both Users)
            </h2>
            {loading && transactions.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                Updating…
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Ledger activity for ({dateRangeLabel})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Filter: All | Mou | Sunny */}
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
            {(["All", ...PEOPLE] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPersonFilter(tab)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  personFilter === tab
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh recent transactions"
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-500" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">
              {loading ? "Refreshing…" : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-1 font-medium underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {/* 3 Metric Stat Cards */}
      {loading && transactions.length === 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 animate-pulse">
          <div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Sunny Card */}
          <div className="relative overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-blue-50/30 p-3.5 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-blue-900/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-800 dark:text-sky-300">
                Sunny (7 Days)
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
            </div>
            <p className="mt-1.5 text-lg font-bold tracking-tight text-sky-950 dark:text-sky-100">
              {formatBDT(sunnyTotal)}
            </p>
          </div>

          {/* Mou Card */}
          <div className="relative overflow-hidden rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-pink-50/30 p-3.5 dark:border-rose-900/40 dark:from-rose-950/30 dark:to-pink-900/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-800 dark:text-rose-300">
                Mou (7 Days)
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            </div>
            <p className="mt-1.5 text-lg font-bold tracking-tight text-rose-950 dark:text-rose-100">
              {formatBDT(mouTotal)}
            </p>
          </div>

          {/* Total Spent Card */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Total Spent
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-200" />
            </div>
            <p className="mt-1.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatBDT(totalSpent)}
            </p>
          </div>
        </div>
      )}

      {/* Recent Transactions Table */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recent Entries {personFilter !== "All" ? `(${personFilter})` : ""}
          </h3>
          <span className="text-xs text-zinc-400">
            {displayRows.length} {displayRows.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading && transactions.length === 0 ? (
          <div className="space-y-2.5 py-3 animate-pulse">
            <div className="h-6 w-full rounded bg-zinc-100 dark:bg-zinc-800/50" />
            <div className="h-8 w-full rounded bg-zinc-50 dark:bg-zinc-800/30" />
            <div className="h-8 w-full rounded bg-zinc-50 dark:bg-zinc-800/30" />
            <div className="h-8 w-full rounded bg-zinc-50 dark:bg-zinc-800/30" />
          </div>
        ) : displayRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-6 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No entries found in the last 7 days{" "}
              {personFilter !== "All" ? `for ${personFilter}` : ""}.
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-x-auto overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-800/70">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50/90 text-xs text-zinc-500 backdrop-blur-xs dark:bg-zinc-850 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {displayRows.map((t) => {
                  const isMou = t.person.trim().toLowerCase() === "mou";
                  const catStyle = getCategoryStyle(t.category);

                  return (
                    <tr
                      key={t.rowNumber}
                      className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {formatDisplayDate(t.date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isMou
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isMou ? "bg-rose-500" : "bg-sky-500"
                            }`}
                          />
                          {t.person || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                          <span className={`h-2 w-2 rounded-full ${catStyle.dot}`} />
                          {t.category || "—"}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-xs text-zinc-500 sm:max-w-[200px] dark:text-zinc-400">
                        {t.remarks || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                        {formatBDT(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
