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
