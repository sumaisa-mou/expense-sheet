import { NextResponse, type NextRequest } from "next/server";
import type { sheets_v4 } from "googleapis";
import { AuthRequiredError, getGoogleAccessToken } from "@/lib/token";
import { describeGoogleError, sheetsClient } from "@/lib/sheets";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler with the session check, the Sheets client, and the
 * error translation every Sheets route needs.
 */
export async function withSheets(
  req: NextRequest,
  handler: (sheets: sheets_v4.Sheets) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const accessToken = await getGoogleAccessToken(req);
    return await handler(sheetsClient(accessToken));
  } catch (error) {
    if (error instanceof AuthRequiredError) return jsonError(401, error.message);
    const { status, message } = describeGoogleError(error);
    return jsonError(status, message);
  }
}
