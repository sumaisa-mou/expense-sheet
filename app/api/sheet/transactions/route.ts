import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withSheets } from "@/lib/api";
import { parseSpreadsheetId } from "@/lib/sheet-url";
import { getRecentTransactions } from "@/lib/controllers/transactions";

/**
 * GET /api/sheet/transactions?id=<url or id>&tab=<tab name>&days=<n>
 * Last N days (default 7) of rows from the tab, newest first.
 */
export async function GET(req: NextRequest) {
  const rawId = req.nextUrl.searchParams.get("id") ?? "";
  const tab = req.nextUrl.searchParams.get("tab") ?? "";
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam && daysParam !== "all" ? Number(daysParam) : 0;

  return withSheets(req, async (sheets) => {
    const spreadsheetId = parseSpreadsheetId(rawId);
    if (!spreadsheetId) return jsonError(400, "Missing or invalid spreadsheet ID.");
    if (!tab) return jsonError(400, "Missing tab name.");
    if (days < 0 || !Number.isFinite(days)) return jsonError(400, "Invalid days value.");

    const result = await getRecentTransactions(sheets, spreadsheetId, tab, days);
    return NextResponse.json(result);
  });
}
