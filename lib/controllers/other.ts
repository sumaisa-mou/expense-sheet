import type { sheets_v4 } from "googleapis";
import { db } from "@/lib/db";
import { getRecentTransactions } from "@/lib/controllers/transactions";
import { getMonthYearKey, parseDateString } from "@/lib/helpers/transactions";
import type {
  MonthTotal,
  OtherData,
  OtherExpense,
  SheetEntry,
  YearStats,
} from "@/lib/other";

type StoredOtherData = Pick<OtherData, "entries" | "months"> & {
  monthOtherTotal: number;
};

const RECENT_LIMIT = 200;

/** Other expenses of `month` (YYYY-MM), their sum, and all saved month totals. */
export async function getOtherData(month: string): Promise<StoredOtherData> {
  const client = await db();
  const [entries, months, sum] = await client.batch(
    [
      {
        sql: `SELECT id, date, category, remarks, amount FROM other_expenses
              WHERE substr(date, 1, 7) = ?
              ORDER BY date DESC, id DESC LIMIT ?`,
        args: [month, RECENT_LIMIT],
      },
      `SELECT month, sheet_total, other_total, total, updated_at
       FROM month_totals ORDER BY month DESC`,
      {
        sql: `SELECT COALESCE(SUM(amount), 0) AS total FROM other_expenses
              WHERE substr(date, 1, 7) = ?`,
        args: [month],
      },
    ],
    "read",
  );

  return {
    monthOtherTotal: Number(sum.rows[0]?.total ?? 0),
    entries: entries.rows.map((r): OtherExpense => ({
      id: Number(r.id),
      date: String(r.date),
      category: String(r.category),
      remarks: String(r.remarks),
      amount: Number(r.amount),
    })),
    months: months.rows.map((r): MonthTotal => ({
      month: String(r.month),
      sheetTotal: Number(r.sheet_total),
      otherTotal: Number(r.other_total),
      total: Number(r.total),
      updatedAt: String(r.updated_at),
    })),
  };
}

/**
 * READ-ONLY on the sheet: sums one person's amounts for a month (YYYY-MM).
 * `tab` is the tab the Expenses page is using; falls back to the first tab.
 */
export async function getSheetMonthTotal(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  month: string,
  person: string,
  tab?: string,
): Promise<{ total: number; tab: string; entries: SheetEntry[] }> {
  const { data } = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const tabs = (data.sheets ?? [])
    .map((s) => s.properties?.title ?? "")
    .filter(Boolean);
  const target = tab && tabs.includes(tab) ? tab : tabs[0];
  if (!target) throw new Error("The expense spreadsheet has no tabs.");

  const { transactions } = await getRecentTransactions(
    sheets,
    spreadsheetId,
    target,
    0,
  );
  const who = person.toLowerCase();
  let total = 0;
  const entries: (SheetEntry & { time: number })[] = [];
  for (const t of transactions) {
    if (t.person.trim().toLowerCase() !== who) continue;
    const parsed = parseDateString(t.date);
    if (!parsed || getMonthYearKey(parsed) !== month) continue;
    total += t.amount;
    entries.push({
      date: t.date,
      category: t.category,
      remarks: t.remarks,
      amount: t.amount,
      time: parsed.getTime(),
    });
  }
  entries.sort((a, b) => a.time - b.time);
  return {
    total,
    tab: target,
    entries: entries.map((e) => ({
      date: e.date,
      category: e.category,
      remarks: e.remarks,
      amount: e.amount,
    })),
  };
}

/**
 * Saves the expense and overwrites that month's single month_totals row with
 * sheetTotal + all Other expenses of the month, in one transaction.
 */
export async function addOtherExpense(
  entry: { date: string; category: string; remarks: string; amount: number },
  sheetTotal: number,
): Promise<void> {
  const client = await db();
  const month = entry.date.slice(0, 7);
  const now = new Date().toISOString();

  await client.batch(
    [
      {
        sql: `INSERT INTO other_expenses (date, category, remarks, amount, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [entry.date, entry.category, entry.remarks, entry.amount, now],
      },
      {
        sql: `INSERT INTO month_totals (month, sheet_total, other_total, total, updated_at)
              SELECT ?, ?, COALESCE(SUM(amount), 0), ? + COALESCE(SUM(amount), 0), ?
              FROM other_expenses WHERE substr(date, 1, 7) = ?
              ON CONFLICT(month) DO UPDATE SET
                sheet_total = excluded.sheet_total,
                other_total = excluded.other_total,
                total = excluded.total,
                updated_at = excluded.updated_at`,
        args: [month, sheetTotal, sheetTotal, now, month],
      },
    ],
    "write",
  );
}

/** SQL that refreshes one month's saved snapshot after an edit/delete. The
 * sheet figure already stored is kept (no sheet read is needed). */
function refreshMonthSql(month: string, now: string) {
  return {
    sql: `UPDATE month_totals SET
            other_total = (SELECT COALESCE(SUM(amount), 0) FROM other_expenses
                           WHERE substr(date, 1, 7) = ?),
            total = sheet_total + (SELECT COALESCE(SUM(amount), 0) FROM other_expenses
                                   WHERE substr(date, 1, 7) = ?),
            updated_at = ?
          WHERE month = ?`,
    args: [month, month, now, month],
  };
}

/** Edits one Other expense. Returns false when the id does not exist. */
export async function updateOtherExpense(
  id: number,
  entry: { date: string; category: string; remarks: string; amount: number },
): Promise<boolean> {
  const client = await db();
  const old = await client.execute({
    sql: "SELECT date FROM other_expenses WHERE id = ?",
    args: [id],
  });
  if (old.rows.length === 0) return false;

  const now = new Date().toISOString();
  const months = new Set([
    String(old.rows[0].date).slice(0, 7),
    entry.date.slice(0, 7),
  ]);
  await client.batch(
    [
      {
        sql: `UPDATE other_expenses SET date = ?, category = ?, remarks = ?, amount = ?
              WHERE id = ?`,
        args: [entry.date, entry.category, entry.remarks, entry.amount, id],
      },
      ...[...months].map((m) => refreshMonthSql(m, now)),
    ],
    "write",
  );
  return true;
}

/** Deletes one Other expense. Returns false when the id does not exist. */
export async function deleteOtherExpense(id: number): Promise<boolean> {
  const client = await db();
  const old = await client.execute({
    sql: "SELECT date FROM other_expenses WHERE id = ?",
    args: [id],
  });
  if (old.rows.length === 0) return false;

  const now = new Date().toISOString();
  await client.batch(
    [
      { sql: "DELETE FROM other_expenses WHERE id = ?", args: [id] },
      refreshMonthSql(String(old.rows[0].date).slice(0, 7), now),
    ],
    "write",
  );
  return true;
}

/** Whole-year Other figures (read-only): the year's total and its top category by total spend. */
export async function getYearAlert(year: string): Promise<YearStats> {
  const client = await db();
  const [sum, top] = await client.batch(
    [
      {
        sql: `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n FROM other_expenses
              WHERE substr(date, 1, 4) = ?`,
        args: [year],
      },
      {
        sql: `SELECT MIN(trim(category)) AS category, SUM(amount) AS total, COUNT(*) AS n
              FROM other_expenses WHERE substr(date, 1, 4) = ?
              GROUP BY lower(trim(category)) ORDER BY total DESC LIMIT 1`,
        args: [year],
      },
    ],
    "read",
  );
  const r = top.rows[0];
  return {
    year,
    otherTotal: Number(sum.rows[0]?.total ?? 0),
    count: Number(sum.rows[0]?.n ?? 0),
    topCategory: r
      ? {
          category: String(r.category),
          total: Number(r.total),
          count: Number(r.n),
        }
      : null,
  };
}
