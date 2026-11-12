"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/client";
import {
  DEFAULT_CATEGORIES,
  formatBDT,
  getCategoryStyle,
  todayISO,
} from "@/lib/field-types";
import { formatDisplayDate, getMonthLabel } from "@/lib/helpers/transactions";
import type { OtherData, OtherExpense, YearStats } from "@/lib/other";

const CARD =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900";
const CONTROL =
  "w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";
const LABEL = "block text-xs font-medium text-zinc-700 dark:text-zinc-300";

/** The tab the Expenses page is working on (it remembers it in this browser). */
function expensesTab(): string {
  try {
    const raw = window.localStorage.getItem("expense-sheet:target");
    return raw ? String((JSON.parse(raw) as { tab?: string }).tab ?? "") : "";
  } catch {
    return "";
  }
}

/** YYYY-MM moved by `delta` months. */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function OtherApp() {
  const [data, setData] = useState<OtherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Set only by the alert endpoint, right after a successful save.
  const [alert, setAlert] = useState<YearStats | null>(null);

  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("");
  const [remarks, setRemarks] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Id of the row being edited in the form; null = adding a new one.
  const [editingId, setEditingId] = useState<number | null>(null);

  // The month being viewed; independent of the date in the entry form.
  const [month, setMonth] = useState(todayISO().slice(0, 7));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchJson<OtherData>(
        `/api/other?month=${month}&tab=${encodeURIComponent(expensesTab())}`,
      );
      setData(next);
      setError(next.dbError ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function resetForm() {
    setEditingId(null);
    setCategory("");
    setRemarks("");
    setAmount("");
    setDate(todayISO());
  }

  function startEdit(e: OtherExpense) {
    setEditingId(e.id);
    setDate(e.date);
    setCategory(e.category);
    setRemarks(e.remarks);
    setAmount(String(e.amount));
    setError(null);
  }

  async function remove(e: OtherExpense) {
    if (
      !window.confirm(
        `Delete ${e.category || "this expense"} (${formatBDT(e.amount)}) from ${formatDisplayDate(e.date)}?`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await fetchJson(`/api/other?id=${e.id}`, { method: "DELETE" });
      if (editingId === e.id) resetForm();
      setAlert(null);
      setNotice("Expense deleted.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editingId !== null) {
        await fetchJson("/api/other", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            date,
            category,
            remarks,
            amount: value,
          }),
        });
        setNotice("Expense updated.");
        resetForm();
        if (date.slice(0, 7) === month) await load();
        else setMonth(date.slice(0, 7));
        return;
      }
      await fetchJson("/api/other", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          category,
          remarks,
          amount: value,
          tab: expensesTab(),
        }),
      });
      setNotice("Expense saved and month total updated.");
      // Saved: ask the alert endpoint for the year's top category.
      const savedYear = date.slice(0, 4);
      void fetchJson<YearStats>(`/api/other/alert?year=${savedYear}`)
        .then(setAlert)
        .catch(() => setAlert(null)); // the save already succeeded; no alert is fine
      setCategory("");
      setRemarks("");
      setAmount("");
      setDate(todayISO());
      // Jump to the month just saved into so the new row is visible.
      if (date.slice(0, 7) === month) await load();
      else setMonth(date.slice(0, 7));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Live figures, ignored while a different month is still loading.
  const live = data?.live.month === month ? data.live : null;

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

      {/* Left: yearly warning. Right: month filter. */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {alert?.topCategory ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  ⚠ Highest other expense in {alert.year} is{" "}
                  {alert.topCategory.category || "Uncategorised"}:{" "}
                  {formatBDT(alert.topCategory.total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlert(null)}
                aria-label="Close warning"
                className="-m-1 rounded-md p-1 text-lg leading-none opacity-60 transition hover:opacity-100"
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            ←
          </button>
          <input
            type="month"
            value={month}
            max={todayISO().slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            aria-label="Month"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= todayISO().slice(0, 7)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {/* Headline: month total (sheet + other) */}
      <section className="mb-5 rounded-2xl bg-zinc-900 p-6 text-white shadow-sm dark:bg-white dark:text-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">
          {getMonthLabel(month)} total
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
          {live ? formatBDT(live.total) : loading ? "…" : "—"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] opacity-60">
              From expense sheet
              {live ? ` (${live.person} · tab ${live.tab})` : ""}
            </p>
            <p className="font-semibold tabular-nums">
              {live ? formatBDT(live.sheetTotal) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] opacity-60">Other</p>
            <p className="font-semibold tabular-nums">
              {live ? formatBDT(live.otherTotal) : "—"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <form onSubmit={submit} className={`${CARD} space-y-4 lg:col-span-5`}>
          <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
            <h2 className="text-sm font-semibold tracking-tight">
              {editingId !== null ? "Edit other expense" : "New other expense"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Saved privately in Turso — never written to the Google Sheet
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="other-date" className={LABEL}>
              Date
            </label>
            <input
              id="other-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={CONTROL}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="other-category" className={LABEL}>
              Category
            </label>
            <input
              id="other-category"
              type="text"
              placeholder="e.g. Food, Shopping, Medicine, Uber..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={CONTROL}
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {DEFAULT_CATEGORIES.map((cat) => {
                const style = getCategoryStyle(cat);
                const selected =
                  category.trim().toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(selected ? "" : cat)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                      selected
                        ? `${style.bg} ${style.text} ${style.border} ring-1 ring-current font-semibold shadow-2xs`
                        : "border-zinc-200 bg-zinc-50/70 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="other-remarks" className={LABEL}>
              Remarks
            </label>
            <textarea
              id="other-remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className={`${CONTROL} resize-y`}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="other-amount" className={LABEL}>
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                ৳
              </span>
              <input
                id="other-amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${CONTROL} pl-8 font-medium`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {submitting
              ? "Saving…"
              : editingId !== null
                ? "Update expense"
                : "Save expense"}
          </button>
          {editingId !== null ? (
            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel edit
            </button>
          ) : null}
        </form>

        <div className="space-y-5 lg:col-span-7">
          <section className={CARD}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Other expenses · {getMonthLabel(month)}
              </h2>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {!data || data.entries.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                {loading ? "Loading…" : "No other expenses this month."}
              </p>
            ) : (
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 dark:text-zinc-400">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Category</th>
                      <th className="pb-2 pr-3 font-medium">Remarks</th>
                      <th className="pb-2 pr-3 text-right font-medium">
                        Amount
                      </th>
                      <th className="pb-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="py-2 pr-3 text-xs whitespace-nowrap">
                          {formatDisplayDate(e.date)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span
                              className={`h-2 w-2 rounded-full ${getCategoryStyle(e.category).dot}`}
                            />
                            {e.category || "—"}
                          </span>
                        </td>
                        <td className="max-w-[160px] truncate py-2 pr-3 text-xs text-zinc-500 dark:text-zinc-400">
                          {e.remarks || "—"}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatBDT(e.amount)}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => startEdit(e)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(e)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data && data.months.length > 0 ? (
            <section className={CARD}>
              <h2 className="mb-3 text-sm font-semibold">Saved month totals</h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 dark:text-zinc-400">
                    <th className="pb-2 pr-3 font-medium">Month</th>
                    <th className="pb-2 pr-3 text-right font-medium">Sheet</th>
                    <th className="pb-2 pr-3 text-right font-medium">Other</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr
                      key={m.month}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-2 pr-3 text-xs sm:text-sm">
                        {getMonthLabel(m.month)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatBDT(m.sheetTotal, false)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatBDT(m.otherTotal, false)}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {formatBDT(m.total, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
