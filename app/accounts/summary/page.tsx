import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { loadAnnualAccounts } from "@/lib/annual-accounts-data";
import { annualActivityRows } from "@/lib/annual-accounts";
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
    {reports.map(({ current: r }) => <section key={r.code} className="space-y-5 rounded-xl border bg-white p-5 md:p-7">
      <div><h2 className="text-2xl font-bold">{r.name}</h2><p className="mt-1 text-sm text-slate-600">{r.rows} bank transactions in the AGM year. Charity and Juniors’ money are shown separately.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{[["Opening bank", r.openingBank], ["Closing bank", r.closingBank], ["Available bank and cash", r.closingFunds]].map(([label, amount]) => <div key={String(label)} className="rounded-lg bg-emerald-50 p-4"><p className="text-sm text-emerald-900">{label}</p><p className="mt-2 text-2xl font-bold">{display(amount as number | null)}</p></div>)}</div>
      <div className="flex flex-wrap gap-3"><a className="rounded bg-emerald-900 px-4 py-2 text-white" href={`/accounts/annual-pdf?account=${r.code}&year=${year}`}>Download AGM pack</a><a className="rounded border px-4 py-2" href={`/accounts/annual-pdf?account=${r.code}&year=${year}&summary=1`}>One-page AGM summary</a><a className="rounded border px-4 py-2" href={`/accounts/year-end?account=${r.code}&year=${year}`}>Year-end review and stock</a><a className="rounded border px-4 py-2" href={`/accounts/agm?account=${r.code}&year=${year}`}>AGM sign-off</a></div>
      <p className="text-sm text-slate-500">Downloads use the latest approved copy when available. Prepare a fresh copy through AGM sign-off for revised accounts.</p>
      <div className="overflow-x-auto"><h3 className="text-lg font-semibold">Revenue and expenditure by activity</h3><p className="mt-1 text-sm text-slate-500">Related fees and costs are grouped together. A negative net amount is a deficit.</p><table className="mt-3 w-full min-w-[550px] text-sm"><thead><tr className="border-b text-left"><th className="py-3">Activity</th><th className="text-right">Revenue</th><th className="text-right">Expenditure</th><th className="text-right">Net surplus / (deficit)</th></tr></thead><tbody>{annualActivityRows(r).map(row => <tr key={row.name} className="border-b"><td className="py-3">{row.name}</td><td className="text-right">{money(row.revenue)}</td><td className="text-right">{money(row.expenditure)}</td><td className={`text-right font-semibold ${row.net < 0 ? "text-red-700" : "text-emerald-800"}`}>{money(row.net)}</td></tr>)}</tbody><tfoot><tr className="bg-emerald-50 font-bold"><td className="py-3">Total</td><td className="text-right">{money(r.totalIncome)}</td><td className="text-right">{money(r.totalExpense)}</td><td className="text-right">{money(r.surplus)}</td></tr></tfoot></table></div>
      <dl className="grid gap-4 text-sm sm:grid-cols-4">{[["Cash on hand", r.closingCash], ["Thommo’s Charity held", r.charity.closing], ["Juniors’ money held", r.juniorClosing], ["Stock value (non-cash)", r.stockValue]].map(([label, amount]) => <div key={String(label)}><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold">{display(amount as number | null)}</dd></div>)}</dl>
      {r.issues.length > 0 && <div className="rounded-lg bg-amber-50 p-4"><h3 className="font-bold">Items to resolve</h3><ul className="mt-2 list-disc space-y-1 pl-5">{r.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
      {r.stockValue === null && <p className="text-sm text-amber-800">Stock count and valuation are unconfirmed. Stock is not included in the available cash figure.</p>}

    </section>)}
  </div></main>;
}
