"use client";

import { useState } from "react";
import { initialValues, specForHeader, type FieldSpec } from "@/lib/field-types";

type Props = {
  headers: string[];
  submitting: boolean;
  onSubmit: (values: Record<string, string>) => Promise<boolean>;
};

const CONTROL_CLASS =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300";

function FieldControl({
  id,
  spec,
  value,
  onChange,
}: {
  id: string;
  spec: FieldSpec;
  value: string;
  onChange: (next: string) => void;
}) {
  const shared = {
    id,
    value,
    className: CONTROL_CLASS,
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => onChange(event.target.value),
  };

  switch (spec.type) {
    case "date":
      return <input {...shared} type="date" />;

    case "number":
      return (
        <input
          {...shared}
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
        />
      );

    case "select":
      return (
        <select {...shared}>
          <option value="">—</option>
          {(spec.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case "textarea":
      return <textarea {...shared} rows={2} className={`${CONTROL_CLASS} resize-y`} />;

    default:
      return <input {...shared} type="text" autoComplete="off" />;
  }
}

export default function EntryForm({ headers, submitting, onSubmit }: Props) {
  // The parent remounts this form via `key` when the column list changes, so
  // these initial values are re-seeded without an effect.
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(headers),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = Object.fromEntries(
      headers.map((header) => [header, values[header] ?? ""]),
    );
    const cleared = await onSubmit(payload);
    // Reset to a fresh form, with the date prefilled again.
    if (cleared) setValues(initialValues(headers));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold">New row</h2>

        <div className="space-y-3">
          {headers.map((header, index) => {
            // Duplicate or blank header names still need unique input ids.
            const fieldId = `field-${index}`;
            const spec = specForHeader(header);

            return (
              <div key={fieldId}>
                <label
                  htmlFor={fieldId}
                  className="block min-w-0 truncate text-sm font-medium"
                >
                  {header || `Column ${index + 1}`}
                </label>
                <FieldControl
                  id={fieldId}
                  spec={spec}
                  value={values[header] ?? ""}
                  onChange={(next) =>
                    setValues((prev) => ({ ...prev, [header]: next }))
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Adding…" : "Add row"}
      </button>
    </form>
  );
}
