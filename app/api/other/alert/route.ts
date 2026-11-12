import { NextResponse, type NextRequest } from "next/server";
import { jsonError, refuseNonOther } from "@/lib/api";
import { DbNotConfiguredError } from "@/lib/db";
import { getYearAlert } from "@/lib/controllers/other";

/**
 * GET /api/other/alert?year=YYYY — the year's largest Other expense and the
 * year's Other total. Called by the page right after an expense is saved.
 */
export async function GET(req: NextRequest) {
  const refused = await refuseNonOther();
  if (refused) return refused;

  const param = req.nextUrl.searchParams.get("year") ?? "";
  const year = /^\d{4}$/.test(param) ? param : String(new Date().getFullYear());

  try {
    return NextResponse.json(await getYearAlert(year));
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return jsonError(503, error.message);
    return jsonError(500, (error as Error)?.message ?? "Database error.");
  }
}
