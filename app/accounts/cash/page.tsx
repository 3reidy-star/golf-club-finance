import Link from "next/link";
import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import CashForm from "./CashForm";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ year?: string }>;
export default async function CashPage({ searchParams }: { searchParams: SearchParams }) {
  if (!await invoiceUser()) redirect("/");
  const params = await searchParams;
  const requested = Number(params.year), currentYear = Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/London", year: "numeric" }).format(new Date()));
  const year = Number.isInteger(requested) && requested >= 2000 && requested <= 2100 ? requested : currentYear;
  const [accounts, counts] = await Promise.all([
    prisma.financeAccount.findMany({ orderBy: { name: "asc" } }),
    prisma.cashYearEnd.findMany({ where: { year }, include: { history: { orderBy: { version: "desc" } } } }),
  ]);
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-5xl">
    <Link href="/accounts" className="text-sm font-semibold text-slate-600">← Accounts</Link>
    <h1 className="mt-6 text-3xl font-bold text-slate-900">Year-end cash on hand</h1>
    <p className="mt-2 text-slate-600">Enter the physical cash held at 31 October for each account. Count only physical cash still held, excluding cash already deposited into the bank. This balance appears separately on the AGM report.</p>
    <form method="get" className="mt-6 flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Year ending 31 October<input type="number" name="year" min="2000" max="2100" defaultValue={year} required className="mt-1 block w-36 rounded-lg border border-slate-300 p-2" /></label><button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Show year</button></form>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{accounts.map(account => { const count = counts.find(item => item.accountCode === account.code); return <CashForm key={`${account.code}-${year}-${count?.version ?? 0}`} accountCode={account.code} name={account.name} year={year} amountPence={count?.amountPence ?? null} note={count?.note ?? ""} version={count?.version ?? 0} />; })}</div>
    {!accounts.length && <p className="mt-6 rounded-xl bg-white p-5">Create or import an account before adding a cash balance.</p>}
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Cash balance history</h2><p className="mt-1 text-sm text-slate-500">Each saved count and subsequent correction is retained.</p>
      <div className="mt-3 divide-y divide-slate-200">{counts.flatMap(count => count.history.map(item => <div key={item.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{count.accountCode === "MENS" ? "Men’s account" : "Club account"} · version {item.version} · {item.recordedAt.toLocaleString("en-GB", { timeZone: "Europe/London" })}{item.note && ` · ${item.note}`}</span><strong>£{(item.amountPence / 100).toFixed(2)}</strong></div>))}{counts.length === 0 && <p className="py-3 text-sm text-slate-500">No cash counts recorded for this year.</p>}</div>
    </section>
  </div></main>;
}
