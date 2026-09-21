/**
 * Maps a sheet's column names to richer input types.
 *
 * The form is still driven by whatever is in row 1 — this only upgrades the
 * control used for columns whose name is recognised. Anything unmatched falls
 * back to a plain text input, so a sheet with different columns still works.
 *
 * To adjust: edit PEOPLE or the `match` lists below. Matching is
 * case-insensitive and ignores punctuation, so "Paid By", "paid_by" and
 * "PAID BY" all resolve the same way.
 */

export type FieldType = "date" | "number" | "select" | "textarea" | "text";

export type FieldSpec = {
  type: FieldType;
  options?: string[];
};

/** Options for the person dropdown. */
export const PEOPLE = ["Mou", "Sunny"];

export type FieldRole = "date" | "person" | "category" | "remarks" | "amount";

const RULES: Array<{ match: string[]; role: FieldRole; spec: FieldSpec }> = [
  {
    match: ["date", "day", "when"],
    role: "date",
    spec: { type: "date" },
  },
  {
    match: ["person", "paid by", "paidby", "who", "member", "spender", "payer"],
    role: "person",
    spec: { type: "select", options: PEOPLE },
  },
  {
    // Free text today. To make it a dropdown, change this to
    // { type: "select", options: ["Food", "Transport", ...] }.
    match: ["category", "kind"],
    role: "category",
    spec: { type: "text" },
  },
  {
    match: ["description", "details", "note", "notes", "item", "purpose"],
    role: "remarks",
    spec: { type: "textarea" },
  },
  {
    match: ["amount", "price", "cost", "total", "spend", "spent", "taka", "bdt"],
    role: "amount",
    spec: { type: "number" },
  },
];

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchRule(header: string) {
  const normalized = normalize(header);
  if (!normalized) return null;

  const words = normalized.split(" ");

  for (const rule of RULES) {
    for (const keyword of rule.match) {
      // Multi-word keywords are matched as a phrase; single words are matched
      // as whole words, so "Amount (BDT)" hits but "Amounts owed" does not.
      const hit = keyword.includes(" ")
        ? normalized.includes(keyword)
        : words.includes(keyword);
      if (hit) return rule;
    }
  }

  return null;
}

export function specForHeader(header: string): FieldSpec {
  return matchRule(header)?.spec ?? { type: "text" };
}

/** Which real-world role a header plays (e.g. "Paid By" -> "person"), or null if unrecognised. */
export function roleForHeader(header: string): FieldRole | null {
  return matchRule(header)?.role ?? null;
}

/** Today as YYYY-MM-DD in the browser's local timezone. */
export function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Seed values for a fresh form: date columns prefilled with today. */
export function initialValues(headers: string[]): Record<string, string> {
  const seeded: Record<string, string> = {};
  for (const header of headers) {
    if (specForHeader(header).type === "date") seeded[header] = todayISO();
  }
  return seeded;
}
