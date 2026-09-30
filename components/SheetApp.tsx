"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EntryForm from "@/components/EntryForm";
import DashboardMetrics from "@/components/DashboardMetrics";
import MonthlyCategorySummary from "@/components/MonthlyCategorySummary";
import type { SheetMeta } from "@/components/SheetPicker";
import { fetchJson } from "@/lib/client";
import { parseSpreadsheetId } from "@/lib/sheet-url";
import type { Transaction } from "@/lib/helpers/transactions";

const STORAGE_KEY = "expense-sheet:target";

type StoredTarget = {
  id: string;
  tab: string;
  headers?: string[];
};

function readStoredTarget(): StoredTarget | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTarget>;
    return parsed.id
      ? {
          id: parsed.id,
          tab: parsed.tab ?? "",
          headers: Array.isArray(parsed.headers) ? parsed.headers : undefined,
        }
      : null;
  } catch {
    // Private mode, cleared storage, or corrupt JSON — just start fresh.
    return null;
  }
}

function writeStoredTarget(target: StoredTarget) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  } catch {
    // Remembering the sheet is a convenience; never let it break a submit.
  }
}

type Props = {
  /** Spreadsheet link/ID from the SHEET_URL env var. Empty when unset. */
  sheetUrl: string;
  userEmail?: string;
};

export default function SheetApp({ sheetUrl }: Props) {
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [tab, setTab] = useState("");
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHeaders = useCallback(async (id: string, tabName: string) => {
    if (!id || !tabName) return;
    try {
      const query = `id=${encodeURIComponent(id)}&tab=${encodeURIComponent(tabName)}`;
      const data = await fetchJson<{ headers: string[] }>(
        `/api/sheet/headers?${query}`,
      );
      setHeaders((prev) => {
        // Only update if headers actually changed to avoid re-mounting EntryForm
        if (
          prev &&
          prev.length === data.headers.length &&
          prev.every((h, i) => h === data.headers[i])
        ) {
          return prev;
        }
        return data.headers;
      });
      writeStoredTarget({ id, tab: tabName, headers: data.headers });
    } catch (err) {
      // Only set error if we don't have any cached headers to display
      setHeaders((prev) => {
        if (!prev) setError((err as Error).message);
        return prev;
      });
    }
  }, []);

  const loadTransactions = useCallback(async (id: string, tabName: string) => {
    if (!id || !tabName) return;
    setLoadingTransactions(true);
    setTransactionError(null);
    try {
      // days=all to fetch all transactions so monthly summary can compute properly
      const query = `id=${encodeURIComponent(id)}&tab=${encodeURIComponent(tabName)}&days=all`;
      const data = await fetchJson<{ transactions: Transaction[] }>(
        `/api/sheet/transactions?${query}`,
      );
      setTransactions(data.transactions);
    } catch (err) {
      setTransactionError((err as Error).message);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const connect = useCallback(
    async (input: string, preferredTab?: string) => {
      setError(null);
      setNotice(null);
      try {
        const data = await fetchJson<SheetMeta>(
          `/api/sheet/meta?id=${encodeURIComponent(input)}`,
        );
        const nextTab =
          preferredTab && data.tabs.includes(preferredTab)
            ? preferredTab
            : data.tabs[0];

        setMeta(data);
        setTab(nextTab);
        writeStoredTarget({
          id: data.spreadsheetId,
          tab: nextTab,
          headers: readStoredTarget()?.headers,
        });

        // Trigger header validation and transactions independently
        void loadHeaders(data.spreadsheetId, nextTab);
        void loadTransactions(data.spreadsheetId, nextTab);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [loadHeaders, loadTransactions],
  );

  // Restore cached target and headers immediately on mount so the form is
  // usable in 0ms without waiting for network roundtrips.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (!sheetUrl) return;

    const stored = readStoredTarget();
    if (stored?.headers && stored.headers.length > 0) {
      setHeaders(stored.headers);
    }
    if (stored?.tab) {
      setTab(stored.tab);
    }

    const initialId = parseSpreadsheetId(sheetUrl);
    if (initialId && stored?.tab) {
      void loadTransactions(initialId, stored.tab);
    }

    void connect(sheetUrl, stored?.tab);
  }, [connect, loadTransactions, sheetUrl]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleSubmit(values: Record<string, string>) {
    const spreadsheetId =
      meta?.spreadsheetId ??
      parseSpreadsheetId(sheetUrl) ??
      readStoredTarget()?.id;

    if (!spreadsheetId || !headers || !tab) return false;

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const data = await fetchJson<{ row: number | null }>("/api/sheet/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: spreadsheetId,
          tab,
          headers,
          values,
        }),
      });
      setNotice(data.row ? `Added to row ${data.row}.` : "Row added successfully.");

      // Refresh recent transactions in background — doesn't block EntryForm
      void loadTransactions(spreadsheetId, tab);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  const activeSpreadsheetId =
    meta?.spreadsheetId ??
    parseSpreadsheetId(sheetUrl) ??
    readStoredTarget()?.id ??
    "";

  return (
    <main className="flex-1 pb-10">
      {!sheetUrl ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          No sheet configured. Set SHEET_URL in the environment and restart the
          server.
        </div>
      ) : null}

      {/* Live Sheet Status Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2.5 shadow-2xs dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <span className="text-zinc-400 dark:text-zinc-500">Active Tab:</span>
          {tab ? (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {tab}
            </span>
          ) : (
            <span className="text-zinc-400">Loading tab…</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Google Sheets Live Sync</span>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
            ✓
          </span>
          <span>{notice}</span>
        </div>
      ) : null}

      {/* Two-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Left Column (5 cols): Entry Form */}
        <div className="lg:col-span-5">
          {headers ? (
            <EntryForm
              key={`${tab}:${headers.join("\u0000")}`}
              headers={headers}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 animate-pulse">
              <div className="mb-4 h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-9 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
                  </div>
                ))}
              </div>
              <div className="mt-4 h-10 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Dashboard Metrics & Monthly Summary */}
        <div className="space-y-5 lg:col-span-7">
          <DashboardMetrics
            transactions={transactions}
            loading={loadingTransactions}
            error={transactionError}
            onRefresh={() => {
              if (activeSpreadsheetId && tab) {
                void loadTransactions(activeSpreadsheetId, tab);
              }
            }}
          />

          <MonthlyCategorySummary
            transactions={transactions}
            loading={loadingTransactions}
          />
        </div>
      </div>
    </main>
  );
}
