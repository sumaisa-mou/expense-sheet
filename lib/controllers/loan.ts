import type { sheets_v4 } from "googleapis";
import { quoteTabName } from "@/lib/sheets";
import { parseAmount } from "@/lib/helpers/transactions";
import type { LoanData, LoanEntry, LoanSummary } from "@/lib/loan";

function toNumberOrNull(raw: string | undefined): number | null {
  if (!raw || !/\d/.test(raw)) return null;
  return parseAmount(raw);
}

/** Read the ledger (A:C) and the sheet's own summary block (E:F). */
export async function getLoanData(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
): Promise<LoanData> {
  const t = quoteTabName(tab);
  const { data } = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [`${t}!A:C`, `${t}!E1:F12`],
    valueRenderOption: "FORMATTED_VALUE",
  });

  const ledger = data.valueRanges?.[0]?.values ?? [];
  const entries: LoanEntry[] = [];
  ledger.slice(1).forEach((row, index) => {
    const [date, description, amount] = row.map((c) => String(c ?? "").trim());
    if (!date && !description && !amount) return;
    entries.push({
      rowNumber: index + 2,
      date: date ?? "",
      description: description ?? "",
      amount: parseAmount(amount),
    });
  });

  // Find summary values by label so the sheet layout can shift without breaking this.
  const summary: LoanSummary = {
    positive: null,
    negative: null,
    totalRepayment: null,
    remaining: null,
    remainingLabel: "Remaining",
  };
  for (const row of data.valueRanges?.[1]?.values ?? []) {
    const label = String(row[0] ?? "").trim();
    const value = toNumberOrNull(String(row[1] ?? ""));
    const key = label.toLowerCase();
    if (key.startsWith("positive")) summary.positive = value;
    else if (key.startsWith("negative")) summary.negative = value;
    else if (key.startsWith("total repayment")) summary.totalRepayment = value;
    else if (key.startsWith("remaining")) {
      summary.remaining = value;
      summary.remainingLabel = label;
    }
  }

  return { entries, summary };
}

/**
 * Writes into the first empty row of A:C. Deliberately not values.append with
 * INSERT_ROWS: that inserts whole sheet rows and would push the summary block
 * and chart in columns E onward out of alignment.
 */
export async function addLoanEntry(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
  entry: { date: string; description: string; amount: number },
): Promise<number> {
  const t = quoteTabName(tab);
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${t}!A:C`,
  });
  const nextRow = (data.values?.length ?? 0) + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${t}!A${nextRow}:C${nextRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[entry.date, entry.description, entry.amount]],
    },
  });
  return nextRow;
}
