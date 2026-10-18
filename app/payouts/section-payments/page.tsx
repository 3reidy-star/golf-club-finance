import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { completeSectionBatch } from "./actions";

export const dynamic = "force-dynamic";
const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export default async function SectionPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "TREASURER"].includes(session.user.role)) redirect("/");
  const lines = await prisma.payoutTopUp.findMany({
    where: { recipientType: "SECTION_ACCOUNT", OR: [
      { completed: false, payoutRequest: { status: "APPROVED" } },
      { completed: true, sectionPaymentBatchId: { not: null } },
    ] },
    include: { payoutRequest: { include: { section: true, competition: true } } },
    orderBy: [{ completedAt: "desc" }, { createdAt: "asc" }],
  });
  const pending = Map.groupBy(lines.filter(line => !line.completed), line => line.payoutRequest.sectionId);
  const batches = Map.groupBy(lines.filter(line => line.completed), line => line.sectionPaymentBatchId!);
  const total = (items: typeof lines) => items.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0);
  function breakdown(items: typeof lines) {
    return <div className="mt-4 divide-y divide-slate-200">{items.map(line => <div key={line.id} className="flex justify-between gap-4 py-3 text-sm">
      <div><p className="font-medium text-slate-900">{line.payoutRequest.competition?.name ?? line.payoutRequest.reason}</p>
        <p className="text-slate-500">{line.payoutRequest.reference}{line.payoutRequest.competition && ` · ${line.payoutRequest.competition.competitionDate.toLocaleDateString("en-GB")}`}</p>
        <p className="text-slate-500">{line.recipientName}{line.accountReference && ` · ${line.accountReference}`}</p></div>
      <p className="whitespace-nowrap font-semibold">{money(Math.round(Number(line.amount) * 100))}</p>
    </div>)}</div>;
  }
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-6xl">
    <Link href="/" className="text-sm text-slate-600">← Dashboard</Link>
    <h1 className="mt-6 text-3xl font-bold text-slate-900">Section Payments</h1>
    <p className="mt-2 text-slate-600">Make one transfer per section, then record the payment reference against all included competitions.</p>
    <div className="my-6 rounded-xl bg-emerald-900 p-6 text-white"><p>Total payable to all sections</p><p className="mt-1 text-3xl font-bold">{money(total(lines.filter(line => !line.completed)))}</p></div>
    <div className="space-y-5">{pending.size === 0 && <p className="rounded-xl bg-white p-6">No section payments waiting.</p>}
      {Array.from(pending, ([sectionId, items]) => {
        const section = items[0].payoutRequest.section;
        const amount = total(items);
        const action = completeSectionBatch.bind(null, sectionId, items.map(line => line.id), amount);
        return <section key={sectionId} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{section.name}</h2><p className="text-sm text-slate-500">{new Set(items.map(line => line.payoutRequestId)).size} payouts included</p>{section.accountReference && <p className="text-sm text-slate-600">{section.accountReference}</p>}</div><div className="text-right"><p className="text-sm text-slate-500">Total payable</p><p className="text-3xl font-bold text-emerald-700">{money(amount)}</p></div></div>
          <details className="mt-4" open><summary className="cursor-pointer font-medium">Competition breakdown</summary>{breakdown(items)}</details>
          <form action={action} className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-5"><label className="flex-1 text-sm font-medium">Payment reference<input name="reference" required maxLength={150} placeholder="Bank transfer reference" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" /></label><button className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">Record {money(amount)} as paid</button><p className="w-full text-xs text-slate-500">Use after making the transfer. All listed amounts will be marked paid together.</p></form>
        </section>;
      })}
    </div>
    <h2 className="mb-4 mt-10 text-2xl font-bold">Completed section payments</h2>
    <p className="mb-4 text-sm text-slate-600">Each payment retains its competition breakdown for reconciliation. Earlier payments remain in <Link href="/payouts/history" className="underline">Payout History</Link>.</p>
    <div className="space-y-4">{batches.size === 0 && <p className="text-slate-500">No grouped payments recorded yet.</p>}{Array.from(batches, ([id, items]) => <details key={id} className="rounded-xl border border-slate-200 bg-white p-6"><summary className="cursor-pointer font-semibold">{items[0].payoutRequest.section.name} · {money(total(items))} · {items[0].completedAt?.toLocaleDateString("en-GB")} · {items[0].sectionPaymentReference}</summary>{breakdown(items)}</details>)}</div>
  </div></main>;
}
