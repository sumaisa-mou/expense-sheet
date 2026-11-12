/**
 * The "Other" page: private expenses kept in Turso instead of the sheet.
 * Only one account may see or use it. The address comes from OTHER_EMAIL
 * (never hardcoded; this repo is public). Unset = nobody has access.
 */
export function canUseOther(email: string | null | undefined): boolean {
  const owner = process.env.OTHER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && email && email.trim().toLowerCase() === owner);
}

/** Whose rows in the expense sheet count towards the monthly total. */
export function otherPerson(): string {
  return process.env.OTHER_PERSON?.trim() || "Mou";
}

export type OtherExpense = {
  id: number;
  /** YYYY-MM-DD */
  date: string;
  category: string;
  remarks: string;
  amount: number;
};

export type MonthTotal = {
  /** YYYY-MM */
  month: string;
  /** Expense-sheet total for the month, as read when the row was last saved. */
  sheetTotal: number;
  /** Sum of Other expenses for the month. */
  otherTotal: number;
  /** sheetTotal + otherTotal */
  total: number;
  /** ISO timestamp of the last overwrite. */
  updatedAt: string;
};

export type SheetEntry = {
  date: string;
  category: string;
  remarks: string;
  amount: number;
};

export type YearStats = {
  year: string;
  /** Sum of all Other expenses in the year. */
  otherTotal: number;
  count: number;
  /** The category with the largest combined spend this year. */
  topCategory: { category: string; total: number; count: number } | null;
};

export type OtherData = {
  /** Other expenses of the requested month. */
  entries: OtherExpense[];
  months: MonthTotal[];
  /** Figures for the requested month, read fresh on every load. */
  live: {
    /** YYYY-MM */
    month: string;
    /** Read from the expense sheet right now (read-only). */
    sheetTotal: number;
    otherTotal: number;
    total: number;
    /** Sheet tab and person the sheet figure was summed from. */
    tab: string;
    person: string;
    /** The sheet rows behind sheetTotal, oldest first. */
    sheetEntries: SheetEntry[];
  };
  /** Set when Turso could not be read; the sheet figure is still returned. */
  dbError?: string;
};
