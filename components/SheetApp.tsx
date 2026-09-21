"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EntryForm from "@/components/EntryForm";
import RecentTransactions from "@/components/RecentTransactions";
import type { SheetMeta } from "@/components/SheetPicker";
// SheetPicker is disabled — the sheet to write to now comes from the
// SHEET_URL env var, so there is no manual "paste a link" step. The
// component is kept in place in case a manual picker is needed again.
// import SheetPicker from "@/components/SheetPicker";
import { fetchJson } from "@/lib/client";
import type { Transaction } from "@/lib/helpers/transactions";

const STORAGE_KEY = "expense-sheet:target";

type StoredTarget = { id: string; tab: string };

function readStoredTarget(): StoredTarget | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTarget>;
    return parsed.id ? { id: parsed.id, tab: parsed.tab ?? "" } : null;
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
};

export default function SheetApp({ sheetUrl }: Props) {
  const [meta, setMeta] = useState<SheetMeta | null>(null);
  const [tab, setTab] = useState("");
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [connecting, setConnecting] = useState(false);
  const [loadingHeaders, setLoadingHeaders] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHeaders = useCallback(async (id: string, tabName: string) => {
    setLoadingHeaders(true);
    setHeaders(null);
    setError(null);
    try {
      const query = `id=${encodeURIComponent(id)}&tab=${encodeURIComponent(tabName)}`;
      const data = await fetchJson<{ headers: string[] }>(
        `/api/sheet/headers?${query}`,
      );
      setHeaders(data.headers);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingHeaders(false);
    }
  }, []);

  const loadTransactions = useCallback(async (id: string, tabName: string) => {
    setLoadingTransactions(true);
    try {
      const query = `id=${encodeURIComponent(id)}&tab=${encodeURIComponent(tabName)}`;
      const data = await fetchJson<{ transactions: Transaction[] }>(
        `/api/sheet/transactions?${query}`,
      );
      setTransactions(data.transactions);
    } catch {
      // The form's own error banner already covers the connect/headers path;
      // a failed transactions fetch just leaves the list empty.
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const connect = useCallback(
    async (input: string, preferredTab?: string) => {
      setConnecting(true);
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
        writeStoredTarget({ id: data.spreadsheetId, tab: nextTab });
        await loadHeaders(data.spreadsheetId, nextTab);
        void loadTransactions(data.spreadsheetId, nextTab);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setConnecting(false);
      }
    },
    [loadHeaders, loadTransactions],
  );

  // Auto-connect to the sheet configured via SHEET_URL — no manual picker
  // step. localStorage is unreadable during SSR, so this has to happen after
  // mount; the guard makes it run exactly once. The remembered tab (if any)
  // is still honored, in case a sheet has more than one tab in use.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (!sheetUrl) return;
    const stored = readStoredTarget();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading an external store on mount is what an effect is for
    void connect(sheetUrl, stored?.tab);
  }, [connect, sheetUrl]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Disabled along with SheetPicker above — these only exist to support its
  // "Change" link and tab dropdown.
  //
  // function handleTabChange(nextTab: string) {
  //   if (!meta) return;
  //   setTab(nextTab);
  //   setNotice(null);
  //   writeStoredTarget({ id: meta.spreadsheetId, tab: nextTab });
  //   void loadHeaders(meta.spreadsheetId, nextTab);
  // }
  //
  // function handleReset() {
  //   try {
  //     window.localStorage.removeItem(STORAGE_KEY);
  //   } catch {
  //     // Ignore — the in-memory reset below is what matters.
  //   }
  //   setMeta(null);
  //   setTab("");
  //   setHeaders(null);
  //   setError(null);
  //   setNotice(null);
  // }

  async function handleSubmit(values: Record<string, string>) {
    if (!meta || !headers) return false;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const data = await fetchJson<{ row: number | null }>("/api/sheet/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: meta.spreadsheetId,
          tab,
          headers,
          values,
        }),
      });
      setNotice(data.row ? `Added to row ${data.row}.` : "Row added.");
      void loadTransactions(meta.spreadsheetId, tab);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 pb-10">
      {/* <SheetPicker
        meta={meta}
        tab={tab}
        connecting={connecting}
        onConnect={(input) => void connect(input)}
        onTabChange={handleTabChange}
        onReset={handleReset}
      /> */}

      {connecting ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Connecting…</p>
      ) : null}

      {!sheetUrl ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          No sheet configured. Set SHEET_URL in the environment and restart
          the server.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div>
      {loadingHeaders ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Reading columns…
        </p>
      ) : null}

      {meta && headers && !loadingHeaders ? (
        <EntryForm
          key={`${tab}:${headers.join("\u0000")}`}
          headers={headers}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      ) : null}
      </div>

      {meta ? (
        <RecentTransactions
          transactions={transactions}
          loading={loadingTransactions}
          onRefresh={() => void loadTransactions(meta.spreadsheetId, tab)}
        />
      ) : null}
      </div>
    </main>
  );
}
