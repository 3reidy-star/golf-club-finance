import { PayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  markPlayerTopUpComplete,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function TopUpsPage() {
  const payouts =
    await prisma.payoutRequest.findMany({
      where: {
        status: PayoutStatus.APPROVED,

        topUps: {
          some: {
            recipientType: "PLAYER",
            completed: false,
          },
        },
      },

      include: {
        section: true,

        topUps: {
          where: {
            recipientType: "PLAYER",
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        approvedAt: "asc",
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
            Player Top-Ups
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Awaiting Kevin
          </h1>

          <p className="mt-2 text-slate-600">
            Player accounts requiring
            credit following Treasurer
            approval.
          </p>
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              No player top-ups waiting.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {payouts.map((payout) => {
              const outstanding =
                payout.topUps.filter(
                  (topUp) =>
                    !topUp.completed,
                );

              const outstandingTotal =
                outstanding.reduce(
                  (total, topUp) =>
                    total +
                    Number(
                      topUp.amount,
                    ),
                  0,
                );

              return (
                <div
                  key={payout.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {
                            payout
                              .section
                              .name
                          }
                        </h2>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          Player Top-Ups
                        </span>
                      </div>

                      <p className="mt-2 text-slate-700">
                        {
                          payout.reason
                        }
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {
                          payout.reference
                        }
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs text-slate-500">
                        Player top-ups
                        outstanding
                      </p>

                      <p className="mt-1 text-2xl font-bold text-emerald-700">
                        £
                        {outstandingTotal.toFixed(
                          2,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
                    <div className="bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Players
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {payout.topUps.map(
                        (topUp) => (
                          <div
                            key={
                              topUp.id
                            }
                            className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                  topUp.completed
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {topUp.completed
                                  ? "✓"
                                  : "£"}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-900">
                                  {
                                    topUp.recipientName
                                  }
                                </p>

                                <p className="text-xs text-slate-500">
                                  Player
                                  account
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-5">
                              <p className="text-xl font-bold text-slate-900">
                                £
                                {Number(
                                  topUp.amount,
                                ).toFixed(
                                  2,
                                )}
                              </p>

                              {topUp.completed ? (
                                <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                  Complete
                                </span>
                              ) : (
                                <form
                                  action={async () => {
                                    "use server";

                                    await markPlayerTopUpComplete(
                                      topUp.id,
                                    );
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                  >
                                    Mark
                                    Complete
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        ),
                      )}
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