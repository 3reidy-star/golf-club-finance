import {
  PayoutStatus,
} from "@prisma/client";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import DeletePayoutButton from "./DeletePayoutButton";

export const dynamic =
  "force-dynamic";

function statusLabel(
  status: PayoutStatus,
) {
  switch (status) {
    case PayoutStatus.REQUESTED:
      return "Requested";
    case PayoutStatus.APPROVED:
      return "Approved";
    case PayoutStatus.REJECTED:
      return "Rejected";
    case PayoutStatus.PAID:
      return "Paid";
    case PayoutStatus.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
}

function statusClasses(
  status: PayoutStatus,
) {
  switch (status) {
    case PayoutStatus.PAID:
      return "bg-emerald-100 text-emerald-800";
    case PayoutStatus.APPROVED:
      return "bg-blue-100 text-blue-800";
    case PayoutStatus.REQUESTED:
      return "bg-amber-100 text-amber-800";
    case PayoutStatus.REJECTED:
      return "bg-red-100 text-red-800";
    case PayoutStatus.CANCELLED:
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !==
      "ADMIN" &&
    session.user.role !==
      "TREASURER"
  ) {
    redirect("/");
  }

  const isAdmin =
    session.user.role ===
    "ADMIN";

  const payouts =
    await prisma.payoutRequest.findMany({
      where: isAdmin
        ? undefined
        : {
            status:
              PayoutStatus.PAID,
          },

      include: {
        section: true,
        requestedBy: true,
        approvedBy: true,
        paidBy: true,
        topUps: true,
      },

      orderBy: isAdmin
        ? {
            requestedAt:
              "desc",
          }
        : {
            paidAt:
              "desc",
          },
    });

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <a
          href="/"
          className="mb-5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Dashboard
        </a>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Accounts
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Payout History
          </h1>

          {isAdmin && (
            <p className="mt-2 text-sm text-slate-600">
              Administrator view shows all payout statuses. Delete should only be used for duplicate or test records.
            </p>
          )}
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              No payouts found.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Date
                    </th>

                    {isAdmin && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Status
                      </th>
                    )}

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Section
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Reason
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Gross
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Fee
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Top-Up
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Paid By
                    </th>

                    {isAdmin && (
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Admin
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {payouts.map(
                    (payout) => (
                      <tr
                        key={
                          payout.id
                        }
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                          {new Date(
                            payout.paidAt ??
                              payout.requestedAt,
                          ).toLocaleDateString(
                            "en-GB",
                          )}
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                payout.status,
                              )}`}
                            >
                              {statusLabel(
                                payout.status,
                              )}
                            </span>
                          </td>
                        )}

                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {
                            payout
                              .section
                              .name
                          }
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div>
                            <p>
                              {
                                payout.reason
                              }
                            </p>

                            {isAdmin && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  payout.reference
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          £
                          {Number(
                            payout.grossAmount,
                          ).toFixed(
                            2,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          £
                          {Number(
                            payout.paymentFeeAmount,
                          ).toFixed(
                            2,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          £
                          {Number(
                            payout.netTopUpAmount,
                          ).toFixed(
                            2,
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700">
                          {
                            payout
                              .paidBy
                              ?.name ??
                            ""
                          }
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <DeletePayoutButton
                              payoutId={
                                payout.id
                              }
                              reference={
                                payout.reference
                              }
                            />
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
