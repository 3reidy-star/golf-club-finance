import Link from "next/link";
import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import DeletePayoutButton from "@/app/payouts/history/DeletePayoutButton";
import MensTopUpShare from "./MensTopUpShare";

export const dynamic = "force-dynamic";

export default async function MensCompetitionPayoutsPage() {
  // The same Treasurer-only account restriction used for private club accounts.
  const treasurer = await invoiceUser();
  if (!treasurer) redirect("/competitions");

  const payouts = await prisma.payoutRequest.findMany({
    where: { section: { code: "MENS" }, competitionId: { not: null } },
    include: {
      competition: true,
      topUps: { where: { recipientType: "PLAYER" }, orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ competition: { competitionDate: "desc" } }, { requestedAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/competitions" className="text-sm font-medium text-slate-600">← Competitions</Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Men&apos;s Section · Treasurer</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Competition Payouts</h1>
        <p className="mt-2 text-slate-600">Player top-ups and WhatsApp messages for each competition, including completed payouts.</p>
        <p className="mt-2 text-sm text-slate-600">To remove other duplicate payouts, open <Link href="/payouts/history" className="underline">Payout History</Link>.</p>
        <div className="mt-6 space-y-5">
          {payouts.length === 0 && <p className="rounded-xl bg-white p-6">No Men&apos;s competition payouts found.</p>}
          {payouts.map(payout => {
            const competition = payout.competition!;
            const date = competition.competitionDate.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
            const shareable = !["REJECTED", "CANCELLED"].includes(payout.status);
            return (
              <section key={payout.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{competition.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{date} · {payout.reference}</p>
                    <p className="mt-1 text-sm text-slate-600">Status: {payout.status.toLowerCase()} · {payout.topUps.filter(line => line.completed).length} of {payout.topUps.length} player top-ups complete</p>
                  </div>
                  <DeletePayoutButton payoutId={payout.id} reference={`${competition.name} (${payout.reference})`} />
                </div>
                {shareable && payout.topUps.length > 0 ? (
                  <MensTopUpShare competitionName={competition.name} competitionDate={date} players={payout.topUps.map(line => ({ name: line.recipientName, amountPence: Math.round(Number(line.amount) * 100) }))} />
                ) : <p className="text-sm text-slate-500">{shareable ? "No player top-ups for this competition." : "WhatsApp sharing is unavailable for rejected or cancelled payouts."}</p>}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
