import type { sheets_v4 } from "googleapis";
import { quoteTabName } from "@/lib/sheets";
import {
  detectColumns,
  rowToTransaction,
  sortByDateDesc,
  withinLastDays,
  type Transaction,
} from "@/lib/helpers/transactions";

export type RecentTransactionsResult = {
  headers: string[];
  transactions: Transaction[];
};

const DEFAULT_WINDOW_DAYS = 7;

/**
 * Reads the whole tab, converts every data row into a Transaction, and keeps
 * only the ones dated within the last `days` days (newest first).
 */
export async function getRecentTransactions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
  days: number = DEFAULT_WINDOW_DAYS,
): Promise<RecentTransactionsResult> {
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: quoteTabName(tab),
    majorDimension: "ROWS",
  });

  const rows = data.values ?? [];
  const headers = (rows[0] ?? []).map((cell) => String(cell ?? "").trim());
  const dataRows = rows.slice(1);

  const columns = detectColumns(headers);

  const transactions = dataRows.map((row, index) =>
    rowToTransaction(
      row.map((cell) => String(cell ?? "")),
      index + 2, // row 1 is the header row
      columns,
    ),
  );

  const filtered = days > 0 ? withinLastDays(transactions, days) : transactions;

  return {
    headers,
    transactions: sortByDateDesc(filtered),
  };
}
