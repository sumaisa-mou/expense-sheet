"use client";

import { useState } from "react";

type Props = {
  headers: string[];
  submitting: boolean;
  onSubmit: (values: Record<string, string>) => Promise<boolean>;
};

export default function EntryForm({ headers, submitting, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  // Every column starts selected; unticking one leaves that cell empty.
  // The parent remounts this form via `key` when the column list changes,
  // so these initial values are re-seeded without an effect.
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(headers.map((header) => [header, true])),
  );

  const activeCount = headers.filter((header) => included[header]).length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = Object.fromEntries(
      headers
        .filter((header) => included[header])
        .map((header) => [header, values[header] ?? ""]),
    );
    const cleared = await onSubmit(payload);
    if (cleared) setValues({});
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">New row</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {activeCount} of {headers.length} fields
          </span>
        </div>

        <div className="space-y-3">
          {headers.map((header, index) => {
            const isOn = included[header] ?? true;
            // Duplicate or blank header names still need unique input ids.
            const fieldId = `field-${index}`;
            return (
              <div key={fieldId} className="flex items-end gap-3">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={(event) =>
                    setIncluded((prev) => ({
                      ...prev,
                      [header]: event.target.checked,
                    }))
                  }
                  aria-label={`Include ${header || `column ${index + 1}`}`}
                  className="mb-2.5 size-4 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                />
                <label htmlFor={fieldId} className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-medium ${
                      isOn ? "" : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {header || `Column ${index + 1}`}
                  </span>
                  <input
                    id={fieldId}
                    value={values[header] ?? ""}
                    disabled={!isOn}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [header]: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300 dark:disabled:bg-zinc-900"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || activeCount === 0}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Adding…" : "Add row"}
      </button>
    </form>
  );
}
