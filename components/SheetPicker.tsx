"use client";

import { useState } from "react";

export type SheetMeta = {
  spreadsheetId: string;
  title: string;
  tabs: string[];
};

type Props = {
  meta: SheetMeta | null;
  tab: string;
  connecting: boolean;
  onConnect: (input: string) => void;
  onTabChange: (tab: string) => void;
  onReset: () => void;
};

export default function SheetPicker({
  meta,
  tab,
  connecting,
  onConnect,
  onTabChange,
  onReset,
}: Props) {
  const [input, setInput] = useState("");

  if (meta) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Writing to
            </p>
            <p className="truncate font-medium">{meta.title}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-sm text-zinc-500 underline underline-offset-4 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Change
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium">Tab</span>
          <select
            value={tab}
            onChange={(event) => onTabChange(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {meta.tabs.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConnect(input);
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">Google Sheet link</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            autoComplete="off"
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
          />
        </label>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Paste the link once — it is remembered on this device.
        </p>
        <button
          type="submit"
          disabled={connecting || input.trim() === ""}
          className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </form>
    </section>
  );
}
