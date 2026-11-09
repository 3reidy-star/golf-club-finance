import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { loadAnnualAccounts } from "@/lib/annual-accounts-data";
import { money } from "@/lib/invoices";
export const dynamic = "force-dynamic";
const display = (value: number | null) => value === null ? "Not confirmed" : money(value);
export default async function AccountsSummaryPage({ searchParams }: { searchParams: Promise<{ account?: string; year?: string }> }) {
  if (!await invoiceUser()) redirect("/");
  const params = await searchParams, requested = Number(params.year), currentYear = new Date().getUTCFullYear();
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : currentYear;
  const filter = params.account === "MENS" || params.account === "CLUB" ? params.account : "ALL";
  const codes: ("CLUB" | "MENS")[] = filter === "ALL" ? ["CLUB", "MENS"] : [filter];
  const reports = await Promise.all(codes.map(code => loadAnnualAccounts(code, year)));
  const years = [...new Set([year, ...Array.from({ length: 7 }, (_, i) => currentYear - i)])].sort((a, b) => b - a);
  return <main className="min-h-screen bg-slate-100 p-4 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
    <a className="underline" href="/accounts">← Transaction history</a>
    <div><p className="text-sm font-semibold uppercase text-slate-500">The Essex Golf &amp; Country Club</p><h1 className="mt-2 text-3xl font-bold">Annual accounts and AGM pack</h1><p className="mt-2 text-slate-600">Financial year: 1 November {year - 1} to 31 October {year}. All figures below and in the pack use this same period.</p></div>
    <form method="get" className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-5"><label>Account<select name="account" defaultValue={filter} className="mt-1 block rounded border p-2"><option value="ALL">Both accounts</option><option value="CLUB">Club Account</option><option value="MENS">Men’s Account</option></select></label><label>Year ending 31 October<select name="year" defaultValue={year} className="mt-1 block rounded border p-2">{years.map(value => <option key={value}>{value}</option>)}</select></label><button className="rounded bg-slate-900 px-4 py-2 font-semibold text-white">Apply</button></form>
    {reports.map(({ current: r, previous }) => <section key={r.code} className="space-y-5 rounded-xl border bg-white p-5 md:p-7">
      <div><h2 className="text-2xl font-bold">{r.name}</h2><p className="mt-1 text-sm text-slate-600">{r.rows} bank transactions in the AGM year. Charity and Juniors’ money are shown separately.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{[["Opening bank", r.openingBank], ["Closing bank", r.closingBank], ["Available bank and cash", r.closingFunds]].map(([label, amount]) => <div key={String(label)} className="rounded-lg bg-emerald-50 p-4"><p className="text-sm text-emerald-900">{label}</p><p className="mt-2 text-2xl font-bold">{display(amount as number | null)}</p></div>)}</div>
      <div className="flex flex-wrap gap-3"><a className="rounded bg-emerald-900 px-4 py-2 text-white" href={`/accounts/annual-pdf?account=${r.code}&year=${year}`}>Download AGM pack</a><a className="rounded border px-4 py-2" href={`/accounts/annual-pdf?account=${r.code}&year=${year}&summary=1`}>One-page AGM summary</a><a className="rounded border px-4 py-2" href={`/accounts/year-end?account=${r.code}&year=${year}`}>Year-end review and stock</a><a className="rounded border px-4 py-2" href={`/accounts/agm?account=${r.code}&year=${year}`}>AGM sign-off</a></div>
      <p className="text-sm text-slate-500">Downloads use the latest approved copy when available. Prepare a fresh copy through AGM sign-off for revised accounts.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Annual result</th><th className="text-right">{year}</th><th className="text-right">{year - 1}</th></tr></thead><tbody>{[["Income after recorded charity allocations", r.totalIncome, previous.totalIncome], ["Expenditure after recorded charity allocations", r.totalExpense, previous.totalExpense], ["Surplus / (deficit)", r.surplus, previous.surplus]].map(([label, value, prior]) => <tr key={String(label)} className="border-b"><td className="py-3">{label}</td><td className="text-right font-semibold">{display(value as number)}</td><td className="text-right">{display(prior as number)}</td></tr>)}</tbody></table></div>
      {r.code === "MENS" && previous.year === 2025 && <p className="text-sm text-amber-800">The 2025 figures include the previous appeal’s £8,206.23 Samaritans payment. They are not a like-for-like comparison of ordinary section spending.</p>}
      <dl className="grid gap-4 text-sm sm:grid-cols-4">{[["Cash on hand", r.closingCash], ["Thommo’s Charity held", r.charity.closing], ["Juniors’ money held", r.juniorClosing], ["Stock value (non-cash)", r.stockValue]].map(([label, amount]) => <div key={String(label)}><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold">{display(amount as number | null)}</dd></div>)}</dl>
      {r.issues.length > 0 && <div className="rounded-lg bg-amber-50 p-4"><h3 className="font-bold">Items to resolve</h3><ul className="mt-2 list-disc space-y-1 pl-5">{r.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
      {r.stockValue === null && <p className="text-sm text-amber-800">Stock count and valuation are unconfirmed. Stock is not included in the available cash figure.</p>}
      <details><summary className="cursor-pointer font-semibold">Income and expenditure by category</summary><div className="mt-4 grid gap-6 md:grid-cols-2">{[["Income", r.income], ["Expenditure", r.expense]].map(([title, rows]) => <div key={String(title)}><h3 className="font-bold">{title as string}</h3><table className="mt-2 w-full text-sm"><tbody>{(rows as typeof r.income).map(row => <tr className="border-b" key={row.name}><td className="py-2">{row.name}</td><td className="text-right">{money(row.amount)}</td></tr>)}</tbody></table></div>)}</div></details>
    </section>)}
  </div></main>;
}
