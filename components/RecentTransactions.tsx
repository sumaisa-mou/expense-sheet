"use client";

import type { Transaction } from "@/lib/helpers/transactions";

type Props = {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
  error?: string | null;
};

export default function RecentTransactions({
  transactions,
  loading,
  onRefresh,
  error,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Last 7 Days</h2>
          {loading && transactions.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
              Updating…
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-1 font-medium underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : loading && transactions.length === 0 ? (
        <div className="space-y-3 py-2 animate-pulse">
          <div className="h-5 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-7 w-full rounded bg-zinc-50 dark:bg-zinc-800/50" />
          <div className="h-7 w-full rounded bg-zinc-50 dark:bg-zinc-800/50" />
          <div className="h-7 w-full rounded bg-zinc-50 dark:bg-zinc-800/50" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No entries in the last 7 days.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 dark:text-zinc-400">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Person</th>
                <th className="pb-2 pr-3 font-medium">Category</th>
                <th className="pb-2 pr-3 font-medium">Remarks</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.rowNumber}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 pr-3 text-xs sm:text-sm">{t.date}</td>
                  <td className="py-2 pr-3">{t.person}</td>
                  <td className="py-2 pr-3">{t.category}</td>
                  <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                    {t.remarks}
                  </td>
                  <td className="py-2 text-right font-medium">{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
