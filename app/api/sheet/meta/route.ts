import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withSheets } from "@/lib/api";
import { parseSpreadsheetId } from "@/lib/sheet-url";

/**
 * GET /api/sheet/meta?id=<url or id>
 * Spreadsheet title plus its tab names. Reads structure only, never cell data.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("id") ?? "";

  return withSheets(req, async (sheets) => {
    const spreadsheetId = parseSpreadsheetId(raw);
    if (!spreadsheetId) {
      return jsonError(400, "That does not look like a Google Sheets link or ID.");
    }

    const { data } = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties.title,sheets.properties.title",
    });

    const tabs = (data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title));

    if (tabs.length === 0) {
      return jsonError(422, "That spreadsheet has no tabs to write to.");
    }

    return NextResponse.json({
      spreadsheetId,
      title: data.properties?.title ?? "Untitled spreadsheet",
      tabs,
    });
  });
}
