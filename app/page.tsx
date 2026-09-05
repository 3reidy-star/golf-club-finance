import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "SECTION_USER") {
    redirect("/payouts/new");
  }

  if (session.user.role === "TOPUP_ADMIN") {
    redirect("/payouts/top-ups");
  }

  const cards = [
    {
      title: "New Payout Request",
      description: "Submit a new section payout request.",
      href: "/payouts/new",
    },
    {
      title: "Awaiting Treasurer Approval",
      description: "Review and approve new payout requests.",
      href: "/payouts/approval",
    },
    {
      title: "Section Payments",
      description: "Section account payments for the Treasurer to complete.",
      href: "/payouts/section-payments",
    },
    {
      title: "Player Top-Ups",
      description: "Individual player account top-ups for Kevin to complete.",
      href: "/payouts/top-ups",
    },
    {
      title: "Completed",
      description: "View completed payouts and the full audit history.",
      href: "/payouts/history",
    },
    {
      title: "Competitions",
      description: "Competition calculations and Intelligent Golf import.",
      href: "/competitions",
    },
    ...(session.user.role === "TREASURER"
      ? [
          {
            title: "Accounts",
            description: "Club and Men's accounts, transaction imports and categorisation.",
            href: "/accounts",
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
            <a key={card.title} href={card.href} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
