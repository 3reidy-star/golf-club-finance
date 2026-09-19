import { PayoutStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role === "SECTION_USER") redirect("/payouts/new");
  if (session.user.role === "TOPUP_ADMIN") redirect("/payouts/top-ups");

  const isTreasurer = session.user.role === "TREASURER";

  const [approvalCount, sectionPaymentCount, playerTopUpCount, unreconciledCount] =
    await Promise.all([
      prisma.payoutRequest.count({
        where: { status: PayoutStatus.REQUESTED },
      }),
      prisma.payoutTopUp.count({
        where: {
          recipientType: "SECTION_ACCOUNT",
          completed: false,
          payoutRequest: { status: PayoutStatus.APPROVED },
        },
      }),
      prisma.payoutTopUp.count({
        where: {
          recipientType: "PLAYER",
          completed: false,
          payoutRequest: { status: PayoutStatus.APPROVED },
        },
      }),
      isTreasurer
        ? prisma.accountTransaction.count({ where: { reconciled: false } })
        : Promise.resolve(0),
    ]);

  const cards = [
    {
      title: "New Payout Request",
      description: "Submit a new section payout request.",
      href: "/payouts/new",
      outstanding: 0,
    },
    {
      title: "Awaiting Treasurer Approval",
      description: "Review and approve new payout requests.",
      href: "/payouts/approval",
      outstanding: approvalCount,
    },
    {
      title: "Section Payments",
      description: "Section account payments for the Treasurer to complete.",
      href: "/payouts/section-payments",
      outstanding: sectionPaymentCount,
    },
    {
      title: "Player Top-Ups",
      description: "Individual player account top-ups for Kevin to complete.",
      href: "/payouts/top-ups",
      outstanding: playerTopUpCount,
    },
    {
      title: "Completed",
      description: "View completed payouts and the full audit history.",
      href: "/payouts/history",
      outstanding: 0,
    },
    {
      title: "Competitions",
      description: "Competition calculations and Intelligent Golf import.",
      href: "/competitions",
      outstanding: 0,
    },
    ...(isTreasurer
      ? [
          {
            title: "Accounts",
            description: "Full Club and Men's transaction history, filters and categorisation.",
            href: "/accounts",
            outstanding: unreconciledCount,
          },
          {
            title: "Annual Accounts",
            description: "Financial-year income, expenditure and category summary for AGM reporting.",
            href: "/accounts/summary",
            outstanding: 0,
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Golf Club Finance</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Treasurer Dashboard</h1>
          <p className="mt-2 text-slate-600">Manage payout requests, section payments, player top-ups, completed transactions and club accounts.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <a key={card.title} href={card.href} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {card.outstanding > 0 && (
                <span className="absolute right-4 top-4 flex min-w-7 items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                  {card.outstanding}
                </span>
              )}
              <h2 className="pr-10 text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
