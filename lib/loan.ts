const SHEET_ID = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const DEFAULT_LOAN_TAB = "Mou to Sunny";

/**
 * The repayment ledger lives in one fixed tab. The spreadsheet comes from the
 * LOAN_SHEET_URL env var (never hardcoded; this repo is public). Null = not configured.
 */
export function loanTarget(): { spreadsheetId: string; tab: string } | null {
  const raw = process.env.LOAN_SHEET_URL?.trim();
  if (!raw) return null;
  return {
    spreadsheetId: raw.match(SHEET_ID)?.[1] ?? raw,
    tab: process.env.LOAN_TAB?.trim() || DEFAULT_LOAN_TAB,
  };
}

export const LOAN_NOT_CONFIGURED = "Repayments sheet is not configured. Set LOAN_SHEET_URL in the environment and restart.";

export type LoanEntry = {
  rowNumber: number;
  date: string;
  description: string;
  amount: number;
};

export type LoanSummary = {
  /** Values come straight from the sheet's own summary cells (E:F). */
  positive: number | null;
  negative: number | null;
  totalRepayment: number | null;
  remaining: number | null;
  remainingLabel: string;
};

export type LoanData = {
  entries: LoanEntry[];
  summary: LoanSummary;
};
