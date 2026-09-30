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
export const PEOPLE = ["Mou", "Sunny"] as const;
export type Person = (typeof PEOPLE)[number];

export const DEFAULT_CATEGORIES = [
  "Food",
  "Shopping",
  "Milk",
  "Diaper",
  "Regular",
  "Fuel",
] as const;

export type CategoryTheme = {
  name: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  progress: string;
};

export const CATEGORY_STYLES: Record<string, CategoryTheme> = {
  Food: {
    name: "Food",
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    progress: "bg-emerald-500",
  },
  Shopping: {
    name: "Shopping",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    progress: "bg-amber-500",
  },
  Milk: {
    name: "Milk",
    color: "#06b6d4",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    dot: "bg-cyan-500",
    progress: "bg-cyan-500",
  },
  Diaper: {
    name: "Diaper",
    color: "#f43f5e",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
    progress: "bg-rose-500",
  },
  Regular: {
    name: "Regular",
    color: "#6366f1",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
    dot: "bg-indigo-500",
    progress: "bg-indigo-500",
  },
  Fuel: {
    name: "Fuel",
    color: "#3b82f6",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
    dot: "bg-sky-500",
    progress: "bg-sky-500",
  },
};

const PALETTE_FALLBACKS: CategoryTheme[] = [
  {
    name: "Other",
    color: "#8b5cf6",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500",
    progress: "bg-purple-500",
  },
  {
    name: "Other",
    color: "#14b8a6",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    dot: "bg-teal-500",
    progress: "bg-teal-500",
  },
  {
    name: "Other",
    color: "#d946ef",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    dot: "bg-fuchsia-500",
    progress: "bg-fuchsia-500",
  },
  {
    name: "Other",
    color: "#ea580c",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
    progress: "bg-orange-500",
  },
  {
    name: "Other",
    color: "#84cc16",
    bg: "bg-lime-50 dark:bg-lime-950/40",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-200 dark:border-lime-800",
    dot: "bg-lime-500",
    progress: "bg-lime-500",
  },
];

export function getCategoryStyle(categoryName: string): CategoryTheme {
  const normalized = categoryName.trim().toLowerCase();
  for (const [key, style] of Object.entries(CATEGORY_STYLES)) {
    if (key.toLowerCase() === normalized) {
      return style;
    }
  }

  // Consistent color hash for any hand-written category
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
  }
  const fallback = PALETTE_FALLBACKS[Math.abs(hash) % PALETTE_FALLBACKS.length];

  return {
    ...fallback,
    name: categoryName || "Other",
  };
}

/** Formats numbers into Bangladeshi Taka format: ৳12,650 or ৳1,160.00 */
export function formatBDT(amount: number, showDecimals = true): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const fixed = showDecimals ? safeAmount.toFixed(2) : Math.round(safeAmount).toString();
  const [whole, decimal] = fixed.split(".");
  const formattedWhole = Number(whole).toLocaleString("en-IN");
  return showDecimals && decimal !== undefined
    ? `৳${formattedWhole}.${decimal}`
    : `৳${formattedWhole}`;
}

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
    spec: { type: "select", options: [...PEOPLE] },
  },
  {
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

/** Seed values for a fresh form: date columns prefilled with today, person prefilled with activePerson. */
export function initialValues(
  headers: string[],
  activePerson?: string,
): Record<string, string> {
  const seeded: Record<string, string> = {};
  for (const header of headers) {
    const role = roleForHeader(header);
    const spec = specForHeader(header);
    if (spec.type === "date" || role === "date") {
      seeded[header] = todayISO();
    } else if (role === "person" && activePerson) {
      seeded[header] = activePerson;
    }
  }
  return seeded;
}
