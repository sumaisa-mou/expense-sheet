/**
 * Pure payout-schedule maths for Sanchaypatra certificates. No I/O.
 *
 * Model (matches how the sheet is laid out):
 *  - Interest is paid every `Frequency` (quarterly = 3 months) counting from the
 *    Deduction Date, on that day of the month, until the maturity date.
 *  - Each payout equals the sheet's "Interest" column (already net of TDS).
 *  - Principal comes back at maturity, separately from interest.
 */

export type Cert = Record<string, string>;

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type Payout = { index: number; date: Date; amount: number; paid: boolean };

export type CertReport = {
  id: string;
  principal: number;
  interestPerPayout: number;
  frequencyMonths: number;
  payouts: Payout[];
  receivedAmount: number;
  receivedCount: number;
  remainingAmount: number;
  remainingCount: number;
  totalInterest: number;
  nextPayout: Payout | null;
  maturityDate: Date | null;
  daysToMaturity: number | null;
  ended: boolean;
  cert: Cert;
};

function num(raw: string | undefined): number {
  const value = Number((raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

/** "14-06-2026", "2026-06-14", "14/06/2026" -> local Date (day-first, like the sheet). */
export function parseDate(value: string | undefined): Date | null {
  const v = (value ?? "").trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return null;
}

/** Adds months, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), last));
  return target;
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function frequencyMonths(text: string | undefined): number {
  const t = (text ?? "").toLowerCase();
  if (t.includes("month")) return 1;
  if (t.includes("quarter")) return 3;
  if (t.includes("half") || t.includes("semi")) return 6;
  if (t.includes("year") || t.includes("annual")) return 12;
  return 3;
}

function tenureMonths(text: string | undefined): number | null {
  const m = (text ?? "").match(/(\d+(?:\.\d+)?)\s*(year|yr|month)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /month/i.test(m[2]) ? Math.round(n) : Math.round(n * 12);
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export function buildCert(cert: Cert, now: number): CertReport | null {
  const principal = num(cert["Amount"]);
  const interest = num(cert["Interest"]);
  const anchor = parseDate(cert["Deduction Date"]) ?? parseDate(cert["Reg. Date"]);
  if (!anchor || principal <= 0) return null;

  const freq = frequencyMonths(cert["Frequency"]);
  const maturity = parseDate(cert["Maturity Date"]);
  const tenure = tenureMonths(cert["Tenure"]) ?? (maturity ? monthsBetween(anchor, maturity) : null);
  if (!tenure || tenure < freq) return null;

  const today = startOfDay(now);
  const count = Math.floor(tenure / freq);
  const payouts: Payout[] = Array.from({ length: count }, (_, i) => {
    const date = addMonths(anchor, (i + 1) * freq);
    return { index: i + 1, date, amount: interest, paid: date <= today };
  });

  const paid = payouts.filter((p) => p.paid);
  const upcoming = payouts.filter((p) => !p.paid);
  const end = maturity ?? payouts[payouts.length - 1].date;

  return {
    id: cert["Reg. No."] || `${cert["Amount"]}-${cert["Reg. Date"]}`,
    principal,
    interestPerPayout: interest,
    frequencyMonths: freq,
    payouts,
    receivedAmount: paid.length * interest,
    receivedCount: paid.length,
    remainingAmount: upcoming.length * interest,
    remainingCount: upcoming.length,
    totalInterest: count * interest,
    nextPayout: upcoming[0] ?? null,
    maturityDate: end,
    daysToMaturity: Math.max(Math.ceil((+end - +today) / 86_400_000), 0),
    ended: end <= today,
    cert,
  };
}

export type MonthSlot = { year: number; month: number; label: string; amount: number };

export type PersonReport = {
  certs: CertReport[];
  receivedAmount: number;
  remainingAmount: number;
  totalInterest: number;
  totalPrincipal: number;
  nextPayout: Payout | null;
  /** Next 12 calendar months starting this month, with the interest landing in each. */
  calendar: MonthSlot[];
  /**
   * Interest per month-of-year (index 0 = Jan) while certificates are alive, judged over
   * the next 24 months so a payout that first lands 13+ months away still counts.
   */
  pattern: number[];
};

export function buildPerson(certs: Cert[], now: number): PersonReport {
  const reports = certs.map((c) => buildCert(c, now)).filter((r): r is CertReport => r !== null);
  const today = new Date(now);

  const calendar: MonthSlot[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const amount = reports
      .flatMap((r) => r.payouts)
      .filter((p) => p.date.getFullYear() === d.getFullYear() && p.date.getMonth() === d.getMonth())
      // Payouts already received earlier this month are real money too, so they stay counted.
      .reduce((sum, p) => sum + p.amount, 0);
    return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, amount };
  });

  const horizon = new Date(today.getFullYear(), today.getMonth() + 24, 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const pattern = new Array<number>(12).fill(0);
  for (const r of reports) {
    const seen = new Set<number>();
    for (const pay of r.payouts) {
      if (pay.date < monthStart || pay.date >= horizon || seen.has(pay.date.getMonth())) continue;
      seen.add(pay.date.getMonth());
      pattern[pay.date.getMonth()] += pay.amount;
    }
  }

  const next = reports
    .map((r) => r.nextPayout)
    .filter((p): p is Payout => p !== null)
    .sort((a, b) => +a.date - +b.date)[0] ?? null;

  return {
    certs: reports,
    receivedAmount: reports.reduce((s, r) => s + r.receivedAmount, 0),
    remainingAmount: reports.reduce((s, r) => s + r.remainingAmount, 0),
    totalInterest: reports.reduce((s, r) => s + r.totalInterest, 0),
    totalPrincipal: reports.reduce((s, r) => s + r.principal, 0),
    nextPayout: next,
    calendar,
    pattern,
  };
}

export type BuyOption = {
  /** Month to buy / get the deduction in. */
  label: string;
  year: number;
  month: number;
  /** Months (0-11) in which this purchase would pay interest each year. */
  payoutMonths: number[];
  gapsFilled: number;
  /** Income already landing in those months (lower = better balance). */
  existingIncome: number;
  recommended: boolean;
};

export type Suggestion = {
  /** Months of the year (0-11) that currently receive no interest in the next 12 months. */
  gapMonths: number[];
  fullyCovered: boolean;
  options: BuyOption[];
  /** Earliest recommended purchase month for each distinct payout pattern, in order. */
  plan: BuyOption[];
};

/**
 * A quarterly certificate bought in month m pays in m+3, m+6, m+9, m+12, so there
 * are only three distinct payout patterns. Rank the next 12 purchase months by how
 * many currently-empty months they fill, then by how little income already lands there.
 */
export function suggestPurchase(person: PersonReport, now: number): Suggestion {
  const income = person.pattern;
  const gapMonths = income.map((v, m) => (v <= 0 ? m : -1)).filter((m) => m >= 0);

  const today = new Date(now);
  const raw: BuyOption[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const payoutMonths = [1, 2, 3, 4].map((k) => (d.getMonth() + k * 3) % 12).sort((a, b) => a - b);
    return {
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      payoutMonths,
      gapsFilled: payoutMonths.filter((m) => income[m] <= 0).length,
      existingIncome: payoutMonths.reduce((s, m) => s + income[m], 0),
      recommended: false,
    };
  });

  const best = [...raw].sort(
    (a, b) => b.gapsFilled - a.gapsFilled || a.existingIncome - b.existingIncome,
  )[0];
  const options = raw.map((o) => ({
    ...o,
    recommended: o.gapsFilled === best.gapsFilled && o.existingIncome === best.existingIncome,
  }));

  // One entry per distinct pattern, best patterns first, each at its earliest month.
  const seen = new Set<string>();
  const plan = [...options]
    .sort((a, b) => b.gapsFilled - a.gapsFilled || a.existingIncome - b.existingIncome || a.year * 12 + a.month - (b.year * 12 + b.month))
    .filter((o) => {
      const key = o.payoutMonths.join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return o.gapsFilled > 0;
    });

  return { gapMonths, fullyCovered: gapMonths.length === 0, options, plan };
}
