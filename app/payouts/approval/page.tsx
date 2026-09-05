import { PayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { approvePayout } from "./actions";

export const dynamic = "force-dynamic";

export default async function ApprovalPage() {
  const payouts = await prisma.payoutRequest.findMany({
    where: {
      status: PayoutStatus.REQUESTED,
    },

    include: {
      section: true,
      requestedBy: true,

      topUps: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },

    orderBy: {
      requestedAt: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="mb-5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Dashboard
        </a>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Treasurer
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Payout approvals
          </h1>

          <p className="mt-2 text-slate-600">
            Review the complete payout request before releasing the section
            payment to the Treasurer queue and any player top-ups to Kevin.
          </p>
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              No payouts awaiting approval.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              New section requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {payouts.map((payout) => {
              const playerTopUps = payout.topUps.filter(
                (topUp) => topUp.recipientType === "PLAYER",
              );

              const sectionTopUps = payout.topUps.filter(
                (topUp) => topUp.recipientType === "SECTION_ACCOUNT",
              );

              const playerTotal = playerTopUps.reduce(
                (total, topUp) => total + Number(topUp.amount),
                0,
              );

              const sectionTotal = sectionTopUps.reduce(
                (total, topUp) => total + Number(topUp.amount),
                0,
              );

              return (
                <div
                  key={payout.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {payout.section.name}
                        </h2>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Awaiting Approval
                        </span>
                      </div>

                      <p className="mt-2 text-slate-700">
                        {payout.reason}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {payout.reference}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-slate-500">
                          Gross
                        </p>

                        <p className="font-semibold text-slate-900">
                          £{Number(payout.grossAmount).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          4% Fee
                        </p>

                        <p className="font-semibold text-slate-900">
                          £{Number(payout.paymentFeeAmount).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Total Payout
                        </p>

                        <p className="text-lg font-bold text-emerald-700">
                          £{Number(payout.netTopUpAmount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                        Kevin — Player Top-Ups
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900">
                        £{playerTotal.toFixed(2)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {playerTopUps.length}{" "}
                        {playerTopUps.length === 1 ? "player" : "players"} to
                        top up
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Treasurer — Section Payment
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-900">
                        £{sectionTotal.toFixed(2)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Pay to {payout.section.name} section account
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
                    <div className="bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Payment breakdown
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {payout.topUps.map((topUp) => (
                        <div
                          key={topUp.id}
                          className="flex items-center justify-between gap-4 px-4 py-4"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {topUp.recipientName}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {topUp.recipientType === "PLAYER"
                                ? "Kevin — Player top-up"
                                : "Treasurer — Section payment"}
                            </p>
                          </div>

                          <p className="text-lg font-bold text-slate-900">
                            £{Number(topUp.amount).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-emerald-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-emerald-900">
                          Approve complete payout
                        </p>

                        <div className="mt-1 space-y-1 text-sm text-emerald-700">
                          {sectionTotal > 0 && (
                            <p>
                              £{sectionTotal.toFixed(2)} will be added to your
                              Section Payments queue.
                            </p>
                          )}

                          {playerTotal > 0 && (
                            <p>
                              £{playerTotal.toFixed(2)} across{" "}
                              {playerTopUps.length}{" "}
                              {playerTopUps.length === 1
                                ? "player"
                                : "players"}{" "}
                              will be added to Kevin&apos;s Player Top-Ups
                              queue.
                            </p>
                          )}
                        </div>
                      </div>

                      <form
                        action={async () => {
                          "use server";

                          await approvePayout(payout.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="whitespace-nowrap rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
                        >
                          Approve Complete Payout
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}