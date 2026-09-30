"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_CATEGORIES,
  getCategoryStyle,
  initialValues,
  roleForHeader,
  specForHeader,
  type FieldRole,
  type FieldSpec,
} from "@/lib/field-types";

type Props = {
  headers: string[];
  submitting: boolean;
  onSubmit: (values: Record<string, string>) => Promise<boolean>;
  activePerson?: string;
};

const CONTROL_CLASS =
  "w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

export default function EntryForm({
  headers,
  submitting,
  onSubmit,
  activePerson,
}: Props) {
  // Re-seed with today's date and activePerson
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(headers, activePerson),
  );

  // Count filled fields
  const filledCount = useMemo(() => {
    return headers.filter((h) => (values[h] ?? "").trim().length > 0).length;
  }, [headers, values]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = Object.fromEntries(
      headers.map((header) => [header, values[header] ?? ""]),
    );
    const cleared = await onSubmit(payload);
    // Reset to a fresh form, keeping activePerson and today's date
    if (cleared) {
      setValues(initialValues(headers, activePerson));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              New row
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Enter new expense transaction for the ledger
            </p>
          </div>

          {/* Dynamic Completion Pill Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              filledCount === headers.length && headers.length > 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                filledCount === headers.length && headers.length > 0
                  ? "bg-emerald-500"
                  : "bg-zinc-400"
              }`}
            />
            {filledCount} of {headers.length} fields filled
          </span>
        </div>

        {/* Inputs */}
        <div className="mt-4 space-y-4">
          {headers.map((header, index) => {
            const fieldId = `field-${index}`;
            const role: FieldRole | null = roleForHeader(header);
            const spec: FieldSpec = specForHeader(header);
            const currentValue = values[header] ?? "";

            return (
              <div key={fieldId} className="space-y-1.5">
                <label
                  htmlFor={fieldId}
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {header || `Column ${index + 1}`}
                </label>

                {/* Amount input with BDT (৳) prefix */}
                {role === "amount" || spec.type === "number" ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                      ৳
                    </span>
                    <input
                      id={fieldId}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={currentValue}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className={`${CONTROL_CLASS} pl-8 font-medium`}
                    />
                  </div>
                ) : role === "category" ? (
                  /* Handwritten Category Input with Quick-fill Suggestion Chips */
                  <div className="space-y-2">
                    <input
                      id={fieldId}
                      type="text"
                      list="category-suggestions"
                      placeholder="e.g. Food, Shopping, Medicine, Uber..."
                      value={currentValue}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className={CONTROL_CLASS}
                      autoComplete="off"
                    />
                    <datalist id="category-suggestions">
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>

                    {/* Quick-Fill Suggestion Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {DEFAULT_CATEGORIES.map((cat) => {
                        const style = getCategoryStyle(cat);
                        const isSelected =
                          currentValue.trim().toLowerCase() ===
                          cat.toLowerCase();

                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() =>
                              setValues((prev) => ({
                                ...prev,
                                [header]: isSelected ? "" : cat,
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                              isSelected
                                ? `${style.bg} ${style.text} ${style.border} ring-1 ring-current font-semibold shadow-2xs`
                                : "border-zinc-200 bg-zinc-50/70 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                            />
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : spec.type === "select" ? (
                  <select
                    id={fieldId}
                    value={currentValue}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className={CONTROL_CLASS}
                  >
                    <option value="">— Select —</option>
                    {(spec.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : spec.type === "date" ? (
                  <input
                    id={fieldId}
                    type="date"
                    value={currentValue}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className={CONTROL_CLASS}
                  />
                ) : spec.type === "textarea" ? (
                  <textarea
                    id={fieldId}
                    rows={2}
                    placeholder="e.g. Tea, Electricity bill, Meena bazar..."
                    value={currentValue}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className={`${CONTROL_CLASS} resize-y`}
                  />
                ) : (
                  <input
                    id={fieldId}
                    type="text"
                    autoComplete="off"
                    value={currentValue}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className={CONTROL_CLASS}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        {submitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>Adding row…</span>
          </>
        ) : (
          <span>Add row</span>
        )}
      </button>
    </form>
  );
}
