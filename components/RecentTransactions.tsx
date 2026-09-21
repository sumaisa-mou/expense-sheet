"use client";

import type { Transaction } from "@/lib/helpers/transactions";

type Props = {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
};

export default function RecentTransactions({
  transactions,
  loading,
  onRefresh,
}: Props) {
  return (
    <section className="rounded-2xl border mt-4 border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Last 7 Days</h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                <tr key={t.rowNumber} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 pr-3">{t.date}</td>
                  <td className="py-2 pr-3">{t.person}</td>
                  <td className="py-2 pr-3">{t.category}</td>
                  <td className="py-2 pr-3">{t.remarks}</td>
                  <td className="py-2 text-right">{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
