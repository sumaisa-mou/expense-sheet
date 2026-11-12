import { NextResponse, type NextRequest } from "next/server";
import { jsonError, refuseNonOther as refuse, withSheets } from "@/lib/api";
import { DbNotConfiguredError } from "@/lib/db";
import { otherPerson, type OtherData } from "@/lib/other";
import { parseSpreadsheetId } from "@/lib/sheet-url";
import {
  addOtherExpense,
  deleteOtherExpense,
  updateOtherExpense,
  getOtherData,
  getSheetMonthTotal,
} from "@/lib/controllers/other";

function dbError(error: unknown) {
  if (error instanceof DbNotConfiguredError)
    return jsonError(503, error.message);
  return jsonError(500, (error as Error)?.message ?? "Database error.");
}

/**
 * GET /api/other?month=YYYY-MM — this month's total straight from the sheet
 * (read-only) plus Other expenses, the recent entries and saved month totals.
 */
export async function GET(req: NextRequest) {
  const refused = await refuse();
  if (refused) return refused;

  const param = req.nextUrl.searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(param)
    ? param
    : new Date().toISOString().slice(0, 7);

  const spreadsheetId = parseSpreadsheetId(process.env.SHEET_URL ?? "");
  if (!spreadsheetId)
    return jsonError(503, "No sheet configured. Set SHEET_URL.");

  return withSheets(req, async (sheets) => {
    const tab = req.nextUrl.searchParams.get("tab") ?? undefined;
    const [sheet, stored] = await Promise.all([
      getSheetMonthTotal(sheets, spreadsheetId, month, otherPerson(), tab),
      // A Turso problem must not hide the sheet figure.
      getOtherData(month).catch((error: unknown) => ({
        entries: [],
        months: [],
        monthOtherTotal: 0,
        dbError:
          error instanceof DbNotConfiguredError
            ? error.message
            : ((error as Error)?.message ?? "Database error."),
      })),
    ]);

    const { monthOtherTotal, ...rest } = stored;
    const data: OtherData = {
      ...rest,
      live: {
        month,
        sheetTotal: sheet.total,
        otherTotal: monthOtherTotal,
        total: sheet.total + monthOtherTotal,
        tab: sheet.tab,
        person: otherPerson(),
        sheetEntries: sheet.entries,
      },
    };
    return NextResponse.json(data);
  });
}

/** POST /api/other — { date: "YYYY-MM-DD", category, remarks, amount } */
export async function POST(req: NextRequest) {
  const refused = await refuse();
  if (refused) return refused;

  let body: {
    date?: string;
    category?: string;
    remarks?: string;
    amount?: number;
    tab?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const date = (body.date ?? "").trim();
  const category = (body.category ?? "").trim();
  const remarks = (body.remarks ?? "").trim();
  const amount = Number(body.amount);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return jsonError(422, "Pick a valid date.");
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError(422, "Enter an amount greater than zero.");
  }

  const spreadsheetId = parseSpreadsheetId(process.env.SHEET_URL ?? "");
  if (!spreadsheetId)
    return jsonError(503, "No sheet configured. Set SHEET_URL.");

  return withSheets(req, async (sheets) => {
    // Sheet is only read. If the read fails nothing is saved, so the month
    // total can never be written from a missing sheet figure.
    const { total: sheetTotal } = await getSheetMonthTotal(
      sheets,
      spreadsheetId,
      date.slice(0, 7),
      otherPerson(),
      typeof body.tab === "string" ? body.tab : undefined,
    );
    try {
      await addOtherExpense({ date, category, remarks, amount }, sheetTotal);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return dbError(error);
    }
  });
}

/** PATCH /api/other — { id, date: "YYYY-MM-DD", category, remarks, amount } */
export async function PATCH(req: NextRequest) {
  const refused = await refuse();
  if (refused) return refused;

  let body: {
    id?: number;
    date?: string;
    category?: string;
    remarks?: string;
    amount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const id = Number(body.id);
  const date = (body.date ?? "").trim();
  const amount = Number(body.amount);
  if (!Number.isInteger(id) || id <= 0)
    return jsonError(422, "Missing expense id.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return jsonError(422, "Pick a valid date.");
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError(422, "Enter an amount greater than zero.");
  }

  try {
    const found = await updateOtherExpense(id, {
      date,
      category: (body.category ?? "").trim(),
      remarks: (body.remarks ?? "").trim(),
      amount,
    });
    return found
      ? NextResponse.json({ ok: true })
      : jsonError(404, "Expense not found.");
  } catch (error) {
    return dbError(error);
  }
}

/** DELETE /api/other?id=123 */
export async function DELETE(req: NextRequest) {
  const refused = await refuse();
  if (refused) return refused;

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0)
    return jsonError(422, "Missing expense id.");

  try {
    const found = await deleteOtherExpense(id);
    return found
      ? NextResponse.json({ ok: true })
      : jsonError(404, "Expense not found.");
  } catch (error) {
    return dbError(error);
  }
}
