import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { invoiceUser } from "@/lib/invoice-auth";
import { ACCOUNT_NAMES, dateText, invoiceStatus, money } from "@/lib/invoices";
export const dynamic = "force-dynamic";
export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ account?: string; status?: string; q?: string }> }) {
  if (!await invoiceUser()) redirect("/");
  const params = await searchParams;
  const accountCode = params.account === "CLUB" || params.account === "MENS" ? params.account : undefined;
  const q = (params.q ?? "").trim().slice(0, 150);
  const invoices = await prisma.invoice.findMany({ where: { accountCode, ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { number: { contains: q, mode: "insensitive" } }, { reference: { contains: q, mode: "insensitive" } }] } : {}) }, include: { payments: true }, orderBy: { createdAt: "desc" } });
  const rows = invoices.map(i => ({ ...i, displayStatus: invoiceStatus(i), paid: i.payments.filter(p => !p.removedAt).reduce((n, p) => n + p.amountPence, 0) }));
  const shown = rows.filter(i => !params.status || i.displayStatus === params.status);
  const issued = rows.filter(i => i.status === "ISSUED");
  const outstanding = issued.reduce((n, i) => n + i.totalPence - i.paid, 0), overdue = issued.filter(i => i.displayStatus === "Overdue").reduce((n, i) => n + i.totalPence - i.paid, 0);
  return <main className="min-h-screen bg-slate-100 p-5 md:p-8"><div className="mx-auto max-w-6xl">
    <Link className="text-sm text-slate-600" href="/">← Dashboard</Link>
    <div className="my-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Invoices</h1><p className="mt-2 text-sm text-slate-600">Create invoices and match receipts from your Club and Men&apos;s accounts.</p></div><Link href="/invoices/new" className="rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white">+ New invoice</Link></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">{[["Outstanding", money(outstanding)], ["Overdue", money(overdue)], ["Drafts", String(rows.filter(i => i.status === "DRAFT").length)]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div>
    <form className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"><label className="text-sm">Account<select name="account" defaultValue={params.account ?? ""} className="mt-1 block rounded border p-2"><option value="">All accounts</option><option value="MENS">Men&apos;s Account</option><option value="CLUB">Club Account</option></select></label><label className="text-sm">Status<select name="status" defaultValue={params.status ?? ""} className="mt-1 block rounded border p-2"><option value="">All statuses</option>{["Draft", "Unpaid", "Part paid", "Overdue", "Paid", "Void"].map(s => <option key={s}>{s}</option>)}</select></label><label className="grow text-sm">Search<input name="q" defaultValue={q} maxLength={150} placeholder="Customer, invoice number or reference" className="mt-1 block w-full rounded border p-2" /></label><button className="rounded bg-slate-900 px-4 py-2 text-white">Filter</button><Link href="/invoices" className="p-2 text-sm underline">Clear</Link></form>
    <p className="mb-3 text-xs text-slate-500">Totals reflect the account and search filters. Issuing an invoice does not change your bank balances.</p>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{["Invoice / customer", "Account", "Invoice date", "Due", "Status", "Total", "Balance"].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{shown.map(i => <tr key={i.id} className="border-t hover:bg-slate-50"><td className="p-4"><Link href={`/invoices/${i.id}`} className="block font-semibold text-emerald-800 underline">{i.number ?? "Draft invoice"}</Link><span>{i.customerName}</span>{i.reference && <p className="text-xs text-slate-500">{i.reference}</p>}</td><td className="p-4">{ACCOUNT_NAMES[i.accountCode]}</td><td className="p-4 whitespace-nowrap">{dateText(i.invoiceDate)}</td><td className="p-4 whitespace-nowrap">{dateText(i.dueDate)}</td><td className={`p-4 font-semibold ${i.displayStatus === "Overdue" ? "text-red-700" : i.displayStatus === "Paid" ? "text-emerald-700" : "text-slate-600"}`}>{i.displayStatus}</td><td className="p-4 whitespace-nowrap">{money(i.totalPence)}</td><td className="p-4 whitespace-nowrap">{i.status === "ISSUED" ? money(i.totalPence - i.paid) : "—"}</td></tr>)}</tbody></table>{!shown.length && <p className="p-8 text-center text-slate-500">No invoices found. Create your first invoice to get started.</p>}</div>
  </div></main>;
}
