import type { sheets_v4 } from "googleapis";
import { quoteTabName } from "@/lib/sheets";
import { parseAmount } from "@/lib/helpers/transactions";
import {
  SANCHAY_PEOPLE,
  type SanchayData,
  type SanchayPerson,
  type SanchayTotalRow,
} from "@/lib/sanchay";

const cell = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => (/\d/.test(cell(v)) ? parseAmount(cell(v)) : null);

/**
 * READ-ONLY. One batchGet for the Total tab and both people's tabs; this module
 * must never call update/append/clear/batchUpdate.
 */
export async function getSanchayData(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<SanchayData> {
  const { data } = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [
      `${quoteTabName("Total")}!A1:C20`,
      ...SANCHAY_PEOPLE.map((p) => `${quoteTabName(p)}!A:AZ`),
    ],
    valueRenderOption: "FORMATTED_VALUE",
  });
  const ranges = data.valueRanges ?? [];

  const total: SanchayTotalRow[] = (ranges[0]?.values ?? [])
    .slice(1)
    .filter((row) => cell(row[0]))
    .map((row) => ({
      label: cell(row[0]),
      investment: num(row[1]),
      monthlyInterest: num(row[2]),
      isTotal: cell(row[0]).toLowerCase() === "total",
    }));

  const people = {} as SanchayData["people"];
  SANCHAY_PEOPLE.forEach((person: SanchayPerson, i) => {
    const rows = ranges[i + 1]?.values ?? [];
    const headers = (rows[0] ?? []).map(cell);
    const certificates = rows
      .slice(1)
      .filter((row) => row.some((c) => cell(c)))
      .map((row) =>
        Object.fromEntries(
          headers.map((h, idx) => [h, cell(row[idx])]).filter(([h]) => h),
        ),
      );
    people[person] = { headers: headers.filter(Boolean), certificates };
  });

  return { total, people };
}
