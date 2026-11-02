import Link from "next/link";
import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import { money, dateText, todayUK } from "@/lib/invoices";
import { charityBalance, toPence } from "@/lib/charity-ledger";
import { AllocateCategorisedForm, AllocateForm, ContributionForm, RemoveForm } from "./CharityForms";

export const dynamic = "force-dynamic";
export default async function CharityPage() {
  if (!await invoiceUser()) redirect("/");
  const [entries, bank] = await Promise.all([
    prisma.charityEntry.findMany({ where: { accountCode: "MENS" }, include: { transaction: true }, orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }] }),
    prisma.accountTransaction.findMany({ where: { accountCode: "MENS" }, include: { invoicePayments: { where: { removedAt: null } }, charityEntries: { where: { removedAt: null } } }, orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }] }),
  ]);
  const todayEnd = new Date(todayUK() + "T00:00:00.000Z"); todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const yearEnd = new Date("2026-11-01T00:00:00.000Z");
  const unmatched = bank.filter(t => t.category.trim().toLowerCase() === "thommo charity" && !t.charityEntries.length);
  const eligibleCategorised = unmatched.filter(t => toPence(t.credit) > 0 && toPence(t.debit) === 0 && t.invoicePayments.length === 0);
  function choices(direction: "RECEIPT" | "COST" | "PAYMENT") {
    return bank.filter(t => !t.charityEntries.length && (direction === "RECEIPT" ? toPence(t.credit) > 0 && toPence(t.debit) === 0 : toPence(t.debit) > 0 && toPence(t.credit) === 0)).map(t => {
      const amount = (direction === "RECEIPT" ? toPence(t.credit) : toPence(t.debit)) - t.invoicePayments.reduce((sum, p) => sum + p.amountPence, 0);
      return { id: t.id, amount, label: `${dateText(t.transactionDate)} · ${t.description} · ${money(amount)} available · ${t.category}` };
    }).filter(t => t.amount > 0);
  }
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-6xl">
    <Link href="/accounts" className="text-sm font-semibold text-slate-600">← Accounts</Link>
    <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Men&apos;s account · Treasurer</p>
    <h1 className="mt-2 text-3xl font-bold">Thommo&apos;s Charity</h1>
    <p className="mt-2 text-slate-600">Record the charity portion of existing bank transactions and track the amount payable. The £83 Awards Night contribution is included from 27 October 2026.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2"><section className="rounded-xl bg-white p-5"><p className="text-sm text-slate-500">Recorded payable today</p><p className="mt-1 text-3xl font-bold text-emerald-700">{money(charityBalance(entries, todayEnd))}</p></section><section className="rounded-xl bg-white p-5"><p className="text-sm text-slate-500">Recorded payable at 31 October 2026</p><p className="mt-1 text-3xl font-bold text-slate-900">{money(charityBalance(entries, yearEnd))}</p></section></div>
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Check the fundraising receipts:</strong> only amounts allocated below are included in the balance. {unmatched.length} bank transaction{unmatched.length === 1 ? " is" : "s are"} categorised as Thommo Charity but not yet allocated. Review the bank history for other relevant receipts too.
      <AllocateCategorisedForm ids={eligibleCategorised.map(t => t.id)} amountPence={eligibleCategorised.reduce((sum, t) => sum + toPence(t.credit), 0)} amount={money(eligibleCategorised.reduce((sum, t) => sum + toPence(t.credit), 0))} />
      <p className="mt-2 text-xs">This allocates the full amount of each eligible receipt. Already allocated receipts are excluded.</p>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-2"><AllocateForm type="RECEIPT" options={choices("RECEIPT")} /><AllocateForm type="COST" options={choices("COST")} /><AllocateForm type="PAYMENT" options={choices("PAYMENT")} /></div>
    <ContributionForm today={todayUK()} />
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-semibold">Charity ledger and audit history</h2><p className="mt-1 text-sm text-slate-500">Fundraising costs and payments reduce the balance from their bank transaction dates. Removed entries remain visible.</p>
      {entries.length === 0 && <p className="mt-4 text-slate-500">No charity entries yet.</p>}
      <div className="mt-4 divide-y divide-slate-200">{entries.map(e => <div key={e.id} className="flex flex-wrap justify-between gap-4 py-4"><div><p className="font-medium">{e.description}</p><p className="text-sm text-slate-500">{dateText(e.effectiveDate)} · {e.type === "CONTRIBUTION" ? "Section contribution" : e.type === "RECEIPT" ? "Fundraising receipt" : e.type === "COST" ? "Fundraising cost" : "Payment to charity"}{e.removedAt && ` · Removed: ${e.removalReason}`}</p>{!e.removedAt && <RemoveForm id={e.id} />}</div><p className={`font-semibold ${e.removedAt ? "text-slate-400 line-through" : "text-slate-900"}`}>{e.type === "PAYMENT" || e.type === "COST" ? "−" : "+"}{money(e.amountPence)}</p></div>)}</div>
    </section>
  </div></main>;
}
