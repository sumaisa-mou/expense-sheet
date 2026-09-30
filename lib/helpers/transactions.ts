import { roleForHeader, type FieldRole } from "@/lib/field-types";

export type Transaction = {
  rowNumber: number;
  date: string;
  person: string;
  category: string;
  remarks: string;
  amount: number;
};

type ColumnIndex = Partial<Record<FieldRole, number>>;

/** Maps each recognised role to the header column that plays it. */
export function detectColumns(headers: string[]): ColumnIndex {
  const columns: ColumnIndex = {};
  headers.forEach((header, index) => {
    const role = roleForHeader(header);
    if (role && columns[role] === undefined) columns[role] = index;
  });
  return columns;
}

/** "৳1,160.00" / "1,160" / "1160" -> 1160. Unparseable becomes 0. */
export function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

/** Tolerant date parse: handles "YYYY-MM-DD" and "DD-MM-YYYY" / "DD/MM/YYYY". */
export function parseDateString(value: string): Date | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const dmy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  return null;
}

/** Returns "DD-MM-YYYY" (e.g. "20-09-2026") */
export function formatDisplayDate(value: string): string {
  const date = parseDateString(value);
  if (!date) return value;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

/** Returns "D MMM" (e.g. "20 Sep") */
export function formatDayMonth(value: string): string {
  const date = parseDateString(value);
  if (!date) return value;
  const day = date.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[date.getMonth()]}`;
}

/** Returns "YYYY-MM" (e.g. "2026-09") */
export function getMonthYearKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns month label (e.g. "September 2026") */
export function getMonthLabel(yearMonthKey: string): string {
  const [yearStr, monthStr] = yearMonthKey.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[monthIdx] ?? "Unknown"} ${year}`;
}

/** Extracts all unique year-months present in transactions, defaulting to current month */
export function getAvailableMonths(
  transactions: Transaction[],
): Array<{ key: string; label: string }> {
  const monthMap = new Map<string, string>();

  // Always include current month
  const now = new Date();
  const currentKey = getMonthYearKey(now);
  monthMap.set(currentKey, getMonthLabel(currentKey));

  for (const t of transactions) {
    const parsed = parseDateString(t.date);
    if (parsed) {
      const key = getMonthYearKey(parsed);
      if (!monthMap.has(key)) {
        monthMap.set(key, getMonthLabel(key));
      }
    }
  }

  // Sort newest year-month first
  return Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, label]) => ({ key, label }));
}

/** One data row (+ its 1-based sheet row number) -> a typed Transaction. */
export function rowToTransaction(
  row: string[],
  rowNumber: number,
  columns: ColumnIndex,
): Transaction {
  const cell = (role: FieldRole) => {
    const index = columns[role];
    return index === undefined ? "" : row[index] ?? "";
  };

  return {
    rowNumber,
    date: cell("date"),
    person: cell("person"),
    category: cell("category"),
    remarks: cell("remarks"),
    amount: parseAmount(cell("amount")),
  };
}

/** Keeps only transactions dated within the last `days` days, today included. */
export function withinLastDays(
  transactions: Transaction[],
  days: number,
): Transaction[] {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return transactions.filter((t) => {
    const parsed = parseDateString(t.date);
    return parsed !== null && parsed >= cutoff;
  });
}

/** Newest first. */
export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const at = parseDateString(a.date)?.getTime() ?? 0;
    const bt = parseDateString(b.date)?.getTime() ?? 0;
    return bt - at;
  });
}
