import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withSheets } from "@/lib/api";
import { parseSpreadsheetId } from "@/lib/sheet-url";
import { quoteTabName } from "@/lib/sheets";

/**
 * GET /api/sheet/headers?id=<url or id>&tab=<tab name>
 * Row 1 of the tab, which becomes the field list for the form.
 */
export async function GET(req: NextRequest) {
  const rawId = req.nextUrl.searchParams.get("id") ?? "";
  const tab = req.nextUrl.searchParams.get("tab") ?? "";

  return withSheets(req, async (sheets) => {
    const spreadsheetId = parseSpreadsheetId(rawId);
    if (!spreadsheetId) return jsonError(400, "Missing or invalid spreadsheet ID.");
    if (!tab) return jsonError(400, "Missing tab name.");

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteTabName(tab)}!1:1`,
      majorDimension: "ROWS",
    });

    const row = data.values?.[0] ?? [];
    let headers = row.map((cell) => String(cell ?? "").trim());

    // SHEET_FIELD_LIMIT caps the form to the first N columns, so trailing
    // summary/pivot columns (monthly totals, per-person breakdowns, etc.)
    // never show up as fields.
    const fieldLimit = Number(process.env.SHEET_FIELD_LIMIT);
    if (Number.isFinite(fieldLimit) && fieldLimit > 0) {
      headers = headers.slice(0, fieldLimit);
    }

    // Trailing empties are just unused columns; drop them so the form does not
    // render a tail of nameless inputs.
    while (headers.length > 0 && headers[headers.length - 1] === "") headers.pop();

    if (headers.length === 0) {
      return jsonError(
        422,
        `The tab "${tab}" has no header row. Add column names to row 1 and try again.`,
      );
    }

    return NextResponse.json({ headers });
  });
}
