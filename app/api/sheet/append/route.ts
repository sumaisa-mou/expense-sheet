import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withSheets } from "@/lib/api";
import { parseSpreadsheetId } from "@/lib/sheet-url";
import { quoteTabName } from "@/lib/sheets";

type AppendBody = {
  id?: string;
  tab?: string;
  /** Header name -> value. Fields the user left out are simply absent. */
  values?: Record<string, string>;
  /** Header order, so the row lands in the right columns. */
  headers?: string[];
};

/** Pull the row number out of a range like "'Sheet1'!A47:F47". */
function rowNumberFrom(range: string | null | undefined): number | null {
  const match = range?.match(/![A-Z]+(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * POST /api/sheet/append
 * Appends one row to the bottom of the tab. Write-only: nothing is read back.
 */
export async function POST(req: NextRequest) {
  return withSheets(req, async (sheets) => {
    let body: AppendBody;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Invalid request body.");
    }

    const spreadsheetId = parseSpreadsheetId(body.id ?? "");
    const tab = body.tab ?? "";
    const headers = body.headers ?? [];
    const values = body.values ?? {};

    if (!spreadsheetId) return jsonError(400, "Missing or invalid spreadsheet ID.");
    if (!tab) return jsonError(400, "Missing tab name.");
    if (headers.length === 0) return jsonError(400, "Missing column headers.");

    // Align to header order; skipped columns stay empty so nothing shifts left.
    const row = headers.map((header) => values[header] ?? "");

    if (row.every((cell) => cell.trim() === "")) {
      return jsonError(422, "Nothing to add — fill in at least one field.");
    }

    const { data } = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${quoteTabName(tab)}!A1`,
      // USER_ENTERED so dates, numbers and formulas are parsed the way they
      // would be if typed into the sheet directly.
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return NextResponse.json({
      ok: true,
      row: rowNumberFrom(data.updates?.updatedRange),
    });
  });
}
