import {
  PayoutStatus,
} from "@prisma/client";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(
  value: Date | null,
) {
  if (!value) {
    return "Not completed";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(value);
}

export default async function CompletedPayoutsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !==
    "SECTION_USER"
  ) {
    redirect(
      "/payouts/history",
    );
  }

  const sectionCode =
    session.user.sectionCodes[0];

  if (!sectionCode) {
    throw new Error(
      "This login has not been assigned to a section.",
    );
  }

  const section =
    await prisma.section.findUnique({
      where: {
        code:
          sectionCode as
          | "MENS"
          | "SENIORS"
          | "LADIES"
          | "JUNIORS"
          | "OTHER",
      },
      select: {
        id: true,
        name: true,
      },
    });

  if (!section) {
    throw new Error(
      "Your section could not be found.",
    );
  }

  const payouts =
    await prisma.payoutRequest.findMany({
      where: {
        sectionId:
          section.id,

        status: {
          in: [
            PayoutStatus.APPROVED,
            PayoutStatus.PAID,
          ],
        },
      },

      include: {
        topUps: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        requestedAt: "desc",
      },

      take: 100,
    });

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <a
            href="/payouts/new"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            New payout request
          </a>

          <a
            href="/payouts/completed"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Completed payouts
          </a>
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {section.name}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Completed payouts
          </h1>

          <p className="mt-2 text-slate-600">
            See when the section payment has been completed by the Treasurer
            and when individual player top-ups have been completed by Kevin.
          </p>
        </div>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              No approved payouts yet.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Approved and completed payments for {section.name} will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {payouts.map((payout) => {
              const sectionPayments =
                payout.topUps.filter(
                  (topUp) =>
                    topUp.recipientType ===
                    "SECTION_ACCOUNT",
                );

              const playerTopUps =
                payout.topUps.filter(
                  (topUp) =>
                    topUp.recipientType ===
                    "PLAYER",
                );

              const sectionComplete =
                sectionPayments.length === 0 ||
                sectionPayments.every(
                  (topUp) =>
                    topUp.completed,
                );

              const playersComplete =
                playerTopUps.length === 0 ||
                playerTopUps.every(
                  (topUp) =>
                    topUp.completed,
                );

              const fullyComplete =
                sectionComplete &&
                playersComplete;

              return (
                <section
                  key={payout.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {payout.reason}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            fullyComplete
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {fullyComplete
                            ? "Complete"
                            : "In progress"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {payout.reference}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">
                        Total payout
                      </p>

                      <p className="text-2xl font-bold text-slate-900">
                        £
                        {Number(
                          payout.netTopUpAmount,
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div
                      className={`rounded-lg border p-4 ${
                        sectionComplete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Treasurer — section payment
                      </p>

                      {sectionPayments.length === 0 ? (
                        <p className="mt-2 font-semibold text-slate-900">
                          No separate section payment
                        </p>
                      ) : (
                        <>
                          <p className="mt-2 text-xl font-bold text-slate-900">
                            £
                            {sectionPayments
                              .reduce(
                                (total, topUp) =>
                                  total +
                                  Number(
                                    topUp.amount,
                                  ),
                                0,
                              )
                              .toFixed(2)}
                          </p>

                          <p className="mt-2 text-sm text-slate-700">
                            {sectionComplete
                              ? `Completed ${formatDate(
                                  sectionPayments
                                    .map(
                                      (topUp) =>
                                        topUp.completedAt,
                                    )
                                    .filter(
                                      (
                                        value,
                                      ): value is Date =>
                                        Boolean(
                                          value,
                                        ),
                                    )
                                    .sort(
                                      (a, b) =>
                                        b.getTime() -
                                        a.getTime(),
                                    )[0] ??
                                    null,
                                )}`
                              : "Awaiting Treasurer payment"}
                          </p>
                        </>
                      )}
                    </div>

                    <div
                      className={`rounded-lg border p-4 ${
                        playersComplete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kevin — player top-ups
                      </p>

                      {playerTopUps.length === 0 ? (
                        <p className="mt-2 font-semibold text-slate-900">
                          No player top-ups
                        </p>
                      ) : (
                        <>
                          <p className="mt-2 font-semibold text-slate-900">
                            {
                              playerTopUps.filter(
                                (topUp) =>
                                  topUp.completed,
                              ).length
                            }{" "}
                            of{" "}
                            {
                              playerTopUps.length
                            }{" "}
                            complete
                          </p>

                          <div className="mt-3 space-y-2">
                            {playerTopUps.map(
                              (topUp) => (
                                <div
                                  key={
                                    topUp.id
                                  }
                                  className="flex items-start justify-between gap-4 text-sm"
                                >
                                  <div>
                                    <p className="font-medium text-slate-900">
                                      {
                                        topUp.recipientName
                                      }
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {topUp.completed
                                        ? formatDate(
                                            topUp.completedAt,
                                          )
                                        : "Awaiting Kevin"}
                                    </p>
                                  </div>

                                  <p className="font-semibold text-slate-900">
                                    £
                                    {Number(
                                      topUp.amount,
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
