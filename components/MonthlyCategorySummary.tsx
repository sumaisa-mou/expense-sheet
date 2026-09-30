"use client";

import { useMemo, useState } from "react";
import {
  formatBDT,
  getCategoryStyle,
  PEOPLE,
  type Person,
} from "@/lib/field-types";
import {
  getAvailableMonths,
  getMonthYearKey,
  parseDateString,
  type Transaction,
} from "@/lib/helpers/transactions";

type UserFilter = "All" | Person;

type Props = {
  transactions: Transaction[];
  loading: boolean;
  activePerson?: string;
};

export default function MonthlyCategorySummary({
  transactions,
  loading,
  activePerson = "Mou",
}: Props) {
  // Available months extracted from transaction dates
  const availableMonths = useMemo(() => {
    return getAvailableMonths(transactions);
  }, [transactions]);

  // Selected month defaults to current month (first item in availableMonths)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return getMonthYearKey(now);
  });

  // Selected person filter defaults to activePerson
  const [selectedPerson, setSelectedPerson] = useState<UserFilter>(
    (activePerson as UserFilter) || "All",
  );

  // Synchronize when activePerson prop changes
  // Filter transactions for the selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const parsed = parseDateString(t.date);
      if (!parsed) return false;
      return getMonthYearKey(parsed) === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Filter transactions for the selected person
  const userMonthTransactions = useMemo(() => {
    if (selectedPerson === "All") return monthTransactions;
    return monthTransactions.filter(
      (t) => t.person.trim().toLowerCase() === selectedPerson.toLowerCase(),
    );
  }, [monthTransactions, selectedPerson]);

  // Overall total for the month (based on user filter)
  const totalMonthSpent = useMemo(() => {
    return userMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [userMonthTransactions]);

  // Breakdown by person when "All" is selected
  const sunnyMonthTotal = useMemo(() => {
    return monthTransactions
      .filter((t) => t.person.trim().toLowerCase() === "sunny")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const mouMonthTotal = useMemo(() => {
    return monthTransactions
      .filter((t) => t.person.trim().toLowerCase() === "mou")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // Group by category, compute sum and count, sort descending
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    for (const t of userMonthTransactions) {
      const cat = t.category.trim() || "Other";
      const existing = map.get(cat) ?? { total: 0, count: 0 };
      map.set(cat, {
        total: existing.total + t.amount,
        count: existing.count + 1,
      });
    }

    const items = Array.from(map.entries()).map(([name, stat]) => {
      const percentage =
        totalMonthSpent > 0 ? (stat.total / totalMonthSpent) * 100 : 0;
      return {
        name,
        total: stat.total,
        count: stat.count,
        percentage,
        style: getCategoryStyle(name),
      };
    });

    return items.sort((a, b) => b.total - a.total);
  }, [userMonthTransactions, totalMonthSpent]);

  const selectedMonthLabel =
    availableMonths.find((m) => m.key === selectedMonth)?.label ?? selectedMonth;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
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
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Monthly Category Summary
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Spending distribution by category
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* User Filter */}
          <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80">
            {(["All", ...PEOPLE] as UserFilter[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedPerson(tab)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                  selectedPerson === tab
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-xs outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-zinc-400"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Total Card */}
      {loading && transactions.length === 0 ? (
        <div className="mt-4 h-16 w-full rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800/60" />
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-150 bg-gradient-to-r from-zinc-50 via-zinc-50/80 to-white p-4 dark:border-zinc-800 dark:from-zinc-850 dark:via-zinc-850 dark:to-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {selectedMonthLabel} Total ({selectedPerson === "All" ? "Both Users" : selectedPerson})
              </span>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatBDT(totalMonthSpent)}
              </p>
            </div>
            {selectedPerson === "All" && totalMonthSpent > 0 ? (
              <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Mou: <strong className="text-zinc-800 dark:text-zinc-200">{formatBDT(mouMonthTotal, false)}</strong>
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Sunny: <strong className="text-zinc-800 dark:text-zinc-200">{formatBDT(sunnyMonthTotal, false)}</strong>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Category Breakdown Progress Bars */}
      <div className="mt-5">
        {loading && transactions.length === 0 ? (
          <div className="space-y-4 py-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
                <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : categoryStats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-6 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No expenses recorded for {selectedMonthLabel}{" "}
              {selectedPerson !== "All" ? `for ${selectedPerson}` : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {categoryStats.map((item) => (
              <div key={item.name} className="group">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.style.dot}`} />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ({item.count} {item.count === 1 ? "entry" : "entries"})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatBDT(item.total)}
                    </span>
                    <span className="min-w-[40px] text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.style.progress}`}
                    style={{ width: `${Math.min(Math.max(item.percentage, 2), 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
