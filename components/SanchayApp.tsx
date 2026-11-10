"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/client";
import {
  SANCHAY_PEOPLE,
  type SanchayData,
  type SanchayPerson,
} from "@/lib/sanchay";
import {
  MONTH_NAMES,
  buildPerson,
  suggestPurchase,
  type CertReport,
  type PersonReport,
} from "@/lib/helpers/sanchay";

const CARD =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900";
const PERSON_KEY = "sanchaypatro:person";
// Same colours as the donut in the sheet: Sunny blue, Mou red.
const PERSON_COLOR: Record<string, string> = { Sunny: "#3b82f6", Mou: "#ef4444" };

function money(value: number | null): string {
  if (value === null) return "—";
  return `৳${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Donut({ slices }: { slices: { label: string; value: number }[] }) {
  const sum = slices.reduce((a, s) => a + s.value, 0);
  if (sum <= 0) return null;
  const R = 40;
  const C = 2 * Math.PI * R;
  const offsets = slices.map((_, i) =>
    slices.slice(0, i).reduce((a, s) => a + (s.value / sum) * C, 0),
  );
  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Investment share">
      {slices.map((s, i) => {
        const len = (s.value / sum) * C;
        return (
          <circle
            key={s.label}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={PERSON_COLOR[s.label] ?? "#a1a1aa"}
            strokeWidth="16"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offsets[i]}
          >
            <title>{`${s.label}: ${Math.round((s.value / sum) * 1000) / 10}%`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

const DETAILS = [
  "Type", "Bank", "Nominee", "Reg. No.", "Tenure", "Frequency", "Interest Rate", "TDS",
  "Reg. Date", "Maturity Date", "Request Date", "Deduction Date",
];
const SHOWN = ["Amount", "Interest", "Interest Before Tax", "TDS Amount", ...DETAILS];

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-[11px] text-zinc-400">{sub}</p> : null}
    </div>
  );
}

function Certificate({ report, headers, index }: { report: CertReport; headers: string[]; index: number }) {
  const [open, setOpen] = useState(false);
  const { cert } = report;
  const pct = report.payouts.length ? report.receivedCount / report.payouts.length : 0;
  const rates = headers.filter((h) => !SHOWN.includes(h));

  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Certificate {index + 1}
          {cert["Reg. No."] ? <span className="ml-2 font-mono text-xs font-normal text-zinc-400">{cert["Reg. No."]}</span> : null}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            report.ended
              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {report.ended ? "Matured" : "Active"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Invested" value={money(report.principal)} />
        <Stat label="Per payout" value={money(report.interestPerPayout)} sub={cert["Frequency"]} />
        <Stat label="Received so far" value={money(report.receivedAmount)} sub={`${report.receivedCount} of ${report.payouts.length} payouts`} />
        <Stat label="Still to come" value={money(report.remainingAmount)} sub={`${report.remainingCount} payouts`} />
      </div>

      <div className="mt-5">
        <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{cert["Deduction Date"] || cert["Reg. Date"]}</span>
          <span>
            {report.ended
              ? "Matured"
              : `Ends ${report.maturityDate ? fmtDate(report.maturityDate) : "—"} · ${report.daysToMaturity?.toLocaleString()} days left`}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Payouts received"
        >
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {report.nextPayout
            ? `Next interest: ${fmtDate(report.nextPayout.date)} · ${money(report.nextPayout.amount)}`
            : "All interest has been paid."}{" "}
          Principal {money(report.principal)} returns at maturity.
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-3 dark:border-zinc-800">
        {SHOWN.filter((h) => cert[h]).map((h) => (
          <div key={h}>
            <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">{h}</dt>
            <dd className="font-medium">{cert[h]}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-4 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
      >
        {open ? "Hide" : "Show"} payout schedule ({report.payouts.length})
      </button>
      {open ? (
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 dark:text-zinc-400">
              <th className="pb-1 pr-3 font-medium">#</th>
              <th className="pb-1 pr-3 font-medium">Date</th>
              <th className="pb-1 pr-3 text-right font-medium">Interest</th>
              <th className="pb-1 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.payouts.map((p) => (
              <tr key={p.index} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5 pr-3 text-zinc-400">{p.index}</td>
                <td className="py-1.5 pr-3">{fmtDate(p.date)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{money(p.amount)}</td>
                <td className={`py-1.5 text-right text-xs ${p.paid ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                  {p.paid ? "Received" : "Upcoming"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {rates.some((h) => cert[h]) ? (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Early withdrawal rates</p>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
            {rates.filter((h) => cert[h]).map((h) => (
              <div key={h} className="flex justify-between gap-3">
                <dt className="text-zinc-500 dark:text-zinc-400">{h}</dt>
                <dd className="font-medium tabular-nums">{cert[h]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function PersonSummary({ person, report }: { person: string; report: PersonReport }) {
  return (
    <section className={CARD}>
      <h2 className="mb-4 text-sm font-semibold">{person}&apos;s interest income</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Received so far" value={money(report.receivedAmount)} />
        <Stat label="Still to come" value={money(report.remainingAmount)} />
        <Stat label="Lifetime interest" value={money(report.totalInterest)} sub={`${report.certs.length} certificate${report.certs.length === 1 ? "" : "s"}`} />
        <Stat
          label="Next interest"
          value={report.nextPayout ? money(report.nextPayout.amount) : "—"}
          sub={report.nextPayout ? fmtDate(report.nextPayout.date) : undefined}
        />
      </div>
    </section>
  );
}

function SuggestionPanel({ person, report, now }: { person: string; report: PersonReport; now: number }) {
  const s = useMemo(() => suggestPurchase(report, now), [report, now]);
  const names = (months: number[]) => months.map((m) => MONTH_NAMES[m]).join(", ");
  const maxIncome = Math.max(...report.calendar.map((c) => c.amount), 1);

  return (
    <section className={`${CARD} space-y-5`}>
      <div>
        <h2 className="text-sm font-semibold">Which month to buy next ({person})</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          A quarterly certificate pays 4 times a year, in the same 3-month pattern as its start month.
          The goal is interest in all 12 months.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Interest by month (next 12 months)</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {report.calendar.map((c) => (
            <div
              key={c.label}
              className={`rounded-lg border px-2 py-1.5 text-center ${
                c.amount > 0
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50"
                  : "border-dashed border-zinc-300 dark:border-zinc-700"
              }`}
              title={c.amount > 0 ? money(c.amount) : "No interest this month"}
            >
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{c.label}</p>
              <p className="text-xs font-semibold tabular-nums">
                {c.amount > 0 ? `৳${Math.round(c.amount).toLocaleString("en-IN")}` : "gap"}
              </p>
              <div className="mx-auto mt-1 h-1 rounded-full bg-emerald-500" style={{ width: `${(c.amount / maxIncome) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>

      {s.fullyCovered ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          ✓ You already receive interest in all 12 months. If you invest more, the months below add to the
          lightest ones.
        </p>
      ) : (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No interest in: <b>{names(s.gapMonths)}</b>
        </p>
      )}

      {s.plan.length > 0 || s.fullyCovered ? (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {s.fullyCovered ? "Best months to add more" : "Plan to cover every month"}
          </p>
          <ol className="space-y-2">
            {(s.fullyCovered ? s.options.filter((o) => o.recommended).slice(0, 1) : s.plan).map((o, i) => (
              <li key={o.label} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
                  {i + 1}
                </span>
                <div>
                  <p>
                    Buy in <b>{o.label}</b>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}(or any of {names([o.month, (o.month + 3) % 12, (o.month + 6) % 12, (o.month + 9) % 12].sort((a, b) => a - b))})
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Interest will arrive every {names(o.payoutMonths)}.
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <details>
        <summary className="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
          All 12 purchase months compared
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 dark:text-zinc-400">
              <th className="pb-1 pr-3 font-medium">Buy in</th>
              <th className="pb-1 pr-3 font-medium">Pays in</th>
              <th className="pb-1 text-right font-medium">Empty months filled</th>
            </tr>
          </thead>
          <tbody>
            {s.options.map((o) => (
              <tr key={o.label} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1.5 pr-3">
                  {o.label}
                  {o.recommended ? (
                    <span className="ml-2 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">best</span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-3 text-zinc-600 dark:text-zinc-400">{names(o.payoutMonths)}</td>
                <td className="py-1.5 text-right tabular-nums">{o.gapsFilled} / 4</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="text-[11px] text-zinc-400">
        Assumes interest is paid every 3 months from the Deduction Date, as in your sheet. Estimate only —
        confirm payout dates with the bank.
      </p>
    </section>
  );
}

export default function SanchayApp() {
  const [data, setData] = useState<SanchayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [person, setPerson] = useState<SanchayPerson>("Mou");
  const [suggesting, setSuggesting] = useState(false);
  const [certIndex, setCertIndex] = useState(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PERSON_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "Mou" || saved === "Sunny") setPerson(saved);
    } catch {
      // Remembering the toggle is only a convenience.
    }
  }, []);

  function choose(next: SanchayPerson) {
    setPerson(next);
    setCertIndex(0);
    try {
      window.localStorage.setItem(PERSON_KEY, next);
    } catch {
      // ignore
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchJson<SanchayData>("/api/sanchaypatro");
      setNow(Date.now());
      setData(result);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totalRow = data?.total.find((r) => r.isTotal);
  const owners = (data?.total ?? []).filter((r) => !r.isTotal && r.investment);
  const personData = data?.people[person];
  const report = useMemo(
    () => (personData && now ? buildPerson(personData.certificates, now) : null),
    [personData, now],
  );
  // Clamp against the parsed certificates (rows that can't be parsed are skipped).
  const activeCert = Math.min(certIndex, Math.max((report?.certs.length ?? 1) - 1, 0));

  return (
    <main className="flex-1 space-y-5 pb-10">
      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {/* Always-visible overall result (the "Total" tab) */}
      <section className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm dark:bg-white dark:text-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total (Mou + Sunny)</p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-white/30 px-3 py-1 text-xs font-medium transition hover:bg-white/10 disabled:opacity-40 dark:border-zinc-900/30 dark:hover:bg-zinc-900/10"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] opacity-60">Investment</p>
            <p className="text-2xl font-bold tabular-nums sm:text-4xl">{loading && !data ? "…" : money(totalRow?.investment ?? null)}</p>
          </div>
          <div>
            <p className="text-[11px] opacity-60">Monthly interest</p>
            <p className="text-2xl font-bold tabular-nums sm:text-4xl">{loading && !data ? "…" : money(totalRow?.monthlyInterest ?? null)}</p>
          </div>
        </div>

        {owners.length > 0 ? (
          <div className="mt-5 flex items-center gap-5 border-t border-white/15 pt-5 dark:border-zinc-900/15">
            <Donut slices={owners.map((o) => ({ label: o.label, value: o.investment ?? 0 }))} />
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              {owners.map((o) => (
                <div key={o.label}>
                  <p className="flex items-center gap-2 text-xs opacity-70">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PERSON_COLOR[o.label] ?? "#a1a1aa" }} />
                    {o.label}
                  </p>
                  <p className="font-semibold tabular-nums">{money(o.investment)}</p>
                  <p className="text-xs tabular-nums opacity-70">{money(o.monthlyInterest)} / month</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Person toggle switches which tab is shown */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900" role="tablist" aria-label="Person">
        {SANCHAY_PEOPLE.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={person === p}
            onClick={() => choose(p)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              person === p
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {!personData || !report ? (
        <div className={`${CARD} animate-pulse text-sm text-zinc-400`}>{loading ? "Loading…" : "No data."}</div>
      ) : report.certs.length === 0 ? (
        <div className={`${CARD} text-center text-sm text-zinc-500`}>No certificates in {person}&apos;s tab.</div>
      ) : (
        <>
          <PersonSummary person={person} report={report} />

          <button
            type="button"
            onClick={() => setSuggesting((v) => !v)}
            aria-expanded={suggesting}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {suggesting ? "Hide suggestion" : `💡 Suggest next sanchaypatro month for ${person}`}
          </button>
          {suggesting ? <SuggestionPanel person={person} report={report} now={now} /> : null}

          <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900" role="tablist" aria-label="Certificates">
            {report.certs.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={activeCert === i}
                onClick={() => setCertIndex(i)}
                className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeCert === i
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Certificate {i + 1}
                <span className="ml-1.5 text-xs font-normal opacity-60">
                  ৳{(r.principal / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })}L
                </span>
              </button>
            ))}
          </div>
          <Certificate
            key={report.certs[activeCert].id}
            report={report.certs[activeCert]}
            headers={personData.headers}
            index={activeCert}
          />
        </>
      )}

      <p className="text-center text-xs text-zinc-400">Read-only view of your Google Sheet.</p>
    </main>
  );
}
