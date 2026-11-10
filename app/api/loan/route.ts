import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withSheets } from "@/lib/api";
import { LOAN_NOT_CONFIGURED, loanTarget } from "@/lib/loan";
import { addLoanEntry, getLoanData } from "@/lib/controllers/loan";

/** GET /api/loan — ledger rows plus the sheet's summary figures. */
export async function GET(req: NextRequest) {
  return withSheets(req, async (sheets) => {
    const target = loanTarget();
    if (!target) return jsonError(503, LOAN_NOT_CONFIGURED);
    return NextResponse.json(await getLoanData(sheets, target.spreadsheetId, target.tab));
  });
}

/** POST /api/loan — { date: "YYYY-MM-DD", description, amount } */
export async function POST(req: NextRequest) {
  return withSheets(req, async (sheets) => {
    let body: { date?: string; description?: string; amount?: number };
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Invalid request body.");
    }

    const date = (body.date ?? "").trim();
    const description = (body.description ?? "").trim();
    const amount = Number(body.amount);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError(422, "Pick a valid date.");
    if (!Number.isFinite(amount) || amount === 0) {
      return jsonError(422, "Enter an amount other than zero.");
    }

    const target = loanTarget();
    if (!target) return jsonError(503, LOAN_NOT_CONFIGURED);
    const row = await addLoanEntry(sheets, target.spreadsheetId, target.tab, { date, description, amount });
    return NextResponse.json({ ok: true, row });
  });
}
