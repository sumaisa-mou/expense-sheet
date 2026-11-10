import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withSheets } from "@/lib/api";
import { SANCHAY_NOT_CONFIGURED, sanchayTarget } from "@/lib/sanchay";
import { getSanchayData } from "@/lib/controllers/sanchay";

/** GET /api/sanchaypatro — read-only. No POST/PUT/DELETE handlers, by design. */
export async function GET(req: NextRequest) {
  return withSheets(req, async (sheets) => {
    const target = sanchayTarget();
    if (!target) return jsonError(503, SANCHAY_NOT_CONFIGURED);
    return NextResponse.json(await getSanchayData(sheets, target.spreadsheetId));
  });
}
