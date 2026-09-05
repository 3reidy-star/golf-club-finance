import { PayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  markSectionPaymentComplete,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SectionPaymentsPage() {
  const payouts =
    await prisma.payoutRequest.findMany({
      where: {
        status: PayoutStatus.APPROVED,

        topUps: {
          some: {
            recipientType:
              "SECTION_ACCOUNT",

            completed: false,
          },
        },
      },

      include: {
        section: true,

        topUps: {
          where: {
            recipientType:
              "SECTION_ACCOUNT",

            completed: false,
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
            Treasurer
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Section Payments
          </h1>

          <p className="mt-2 text-slate-600">
            Approved amounts that you
            need to transfer to section
            accounts.
          </p>
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              No section payments
              waiting.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {payouts.map(
              (payout) => (
                <div
                  key={payout.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {
                            payout
                              .section
                              .name
                          }
                        </h2>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Payment
                          Required
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
                  </div>

                  <div className="mt-6 space-y-3">
                    {payout.topUps.map(
                      (topUp) => (
                        <div
                          key={
                            topUp.id
                          }
                          className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm text-slate-500">
                              Pay to
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {
                                topUp.recipientName
                              }
                            </p>

                            {topUp.accountReference && (
                              <p className="mt-1 text-sm text-slate-500">
                                {
                                  topUp.accountReference
                                }
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-5">
                            <p className="text-2xl font-bold text-emerald-700">
                              £
                              {Number(
                                topUp.amount,
                              ).toFixed(
                                2,
                              )}
                            </p>

                            <form
                              action={async () => {
                                "use server";

                                await markSectionPaymentComplete(
                                  topUp.id,
                                );
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
                              >
                                Payment
                                Complete
                              </button>
                            </form>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}