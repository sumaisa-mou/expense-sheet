/** Sanchaypatro (savings certificates) sheet. Read-only: nothing here writes. */
const SHEET_ID = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

export const SANCHAY_PEOPLE = ["Mou", "Sunny"] as const;
export type SanchayPerson = (typeof SANCHAY_PEOPLE)[number];

/** From the SANCHAY_SHEET_URL env var (never hardcoded; this repo is public). Null = not configured. */
export function sanchayTarget(): { spreadsheetId: string } | null {
  const raw = process.env.SANCHAY_SHEET_URL?.trim();
  if (!raw) return null;
  return { spreadsheetId: raw.match(SHEET_ID)?.[1] ?? raw };
}

export const SANCHAY_NOT_CONFIGURED =
  "Sanchaypatro sheet is not configured. Set SANCHAY_SHEET_URL in the environment and restart.";

export type SanchayTotalRow = {
  label: string;
  investment: number | null;
  monthlyInterest: number | null;
  isTotal: boolean;
};

export type SanchayCertificate = Record<string, string>;

export type SanchayData = {
  total: SanchayTotalRow[];
  people: Record<SanchayPerson, { headers: string[]; certificates: SanchayCertificate[] }>;
};
