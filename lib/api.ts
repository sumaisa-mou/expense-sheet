import { NextResponse, type NextRequest } from "next/server";
import type { sheets_v4 } from "googleapis";
import { auth } from "@/lib/auth";
import { canUseOther } from "@/lib/other";
import { AuthRequiredError, getGoogleAccessToken } from "@/lib/token";
import { describeGoogleError, sheetsClient } from "@/lib/sheets";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Null when the signed-in account is the Other owner, else the refusal. */
export async function refuseNonOther(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) return jsonError(401, "Not signed in.");
  if (!canUseOther(session.user.email)) return jsonError(403, "Not allowed.");
  return null;
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
