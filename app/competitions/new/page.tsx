"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import {
  buildMensImportPreview,
} from "@/lib/intelligentGolfParser";

import {
  createMensCompetitionFromImport,
} from "./actions";

export default function NewCompetitionPage() {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [name, setName] =
    useState("");

  const [
    competitionDate,
    setCompetitionDate,
  ] = useState("");

  const [entrants, setEntrants] =
    useState("");

  const [entryFee, setEntryFee] =
    useState("5");

  const [
    intelligentGolfText,
    setIntelligentGolfText,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const preview = useMemo(() => {
    if (
      !intelligentGolfText.trim()
    ) {
      return null;
    }

    return buildMensImportPreview({
      rawText:
        intelligentGolfText,

      entrants:
        Number(entrants) || 0,

      entryFee:
        Number(entryFee) || 5,
    });
  }, [
    intelligentGolfText,
    entrants,
    entryFee,
  ]);

  useEffect(() => {
    if (
      !competitionDate &&
      preview?.importData
        .detectedDate
    ) {
      setCompetitionDate(
        preview.importData
          .detectedDate,
      );
    }
  }, [
    preview,
    competitionDate,
  ]);

  function handleSubmit() {
    setError(null);

    startTransition(
      async () => {
        try {
          await createMensCompetitionFromImport(
            {
              name,

              competitionDate,

              entrants:
                Number(
                  entrants,
                ),

              entryFee:
                Number(
                  entryFee,
                ),

              intelligentGolfText,

              notes,
            },
          );

          router.push(
            "/payouts/approval",
          );

          router.refresh();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to create the competition payout.",
          );
        }
      },
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <a
          href="/competitions"
          className="mb-5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Competitions
        </a>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Men&apos;s Section
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Intelligent Golf
            Competition Import
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Copy the competition
            results and Birdie 2s
            information from
            Intelligent Golf, paste it
            below and the system will
            calculate the payouts.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Competition Details
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Competition name
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target
                          .value,
                      )
                    }
                    placeholder="e.g. Monthly Medal"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Competition date
                  </label>

                  <input
                    type="date"
                    value={
                      competitionDate
                    }
                    onChange={(e) =>
                      setCompetitionDate(
                        e.target
                          .value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Total entrants
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        entrants
                      }
                      onChange={(
                        e,
                      ) =>
                        setEntrants(
                          e.target
                            .value,
                        )
                      }
                      placeholder="52"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Entry fee
                    </label>

                    <div className="flex rounded-lg border border-slate-300">
                      <span className="flex items-center px-3 text-slate-500">
                        £
                      </span>

                      <input
                        type="number"
                        step="0.01"
                        value={
                          entryFee
                        }
                        onChange={(
                          e,
                        ) =>
                          setEntryFee(
                            e.target
                              .value,
                          )
                        }
                        className="w-full rounded-r-lg px-3 py-2 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Paste from
                Intelligent Golf
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Paste Division One,
                Division Two/Three,
                Birdie 2s paid players
                and the Birdie 2s
                results. They can all
                be pasted into the same
                box.
              </p>

              <textarea
                value={
                  intelligentGolfText
                }
                onChange={(e) =>
                  setIntelligentGolfText(
                    e.target.value,
                  )
                }
                rows={20}
                placeholder="Paste Intelligent Golf information here..."
                className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm text-slate-900"
              />

              {intelligentGolfText && (
                <button
                  type="button"
                  onClick={() =>
                    setIntelligentGolfText(
                      "",
                    )
                  }
                  className="mt-3 text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                  Clear pasted
                  information
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {!preview ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-lg font-semibold text-slate-900">
                  Paste the Intelligent
                  Golf information to
                  begin
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Results and payouts
                  will appear here
                  automatically.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Import Summary
                  </h2>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Summary
                      label="Results recognised"
                      value={`${preview.importData.players.length}`}
                    />

                    <Summary
                      label="Birdie 2s entrants"
                      value={`${preview.importData.twosPaidPlayers.length}`}
                    />

                    <Summary
                      label="Birdie 2s winners"
                      value={`${preview.importData.twosWinners.length}`}
                    />

                    <Summary
                      label="2s entry"
                      value={`£${preview.importData.twosEntryFee.toFixed(
                        2,
                      )}`}
                    />
                  </div>
                </div>

                {preview.errors.length >
                  0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="font-semibold text-red-900">
                      Import needs
                      attention
                    </p>

                    <ul className="mt-3 space-y-2 text-sm text-red-700">
                      {preview.errors.map(
                        (
                          message,
                          index,
                        ) => (
                          <li
                            key={
                              index
                            }
                          >
                            •{" "}
                            {
                              message
                            }
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {preview.warnings.length >
                  0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <p className="font-semibold text-amber-900">
                      Checks
                    </p>

                    <ul className="mt-3 space-y-2 text-sm text-amber-700">
                      {preview.warnings.map(
                        (
                          message,
                          index,
                        ) => (
                          <li
                            key={
                              index
                            }
                          >
                            •{" "}
                            {
                              message
                            }
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {[
                  1,
                  2,
                  3,
                ].map(
                  (division) => {
                    const results =
                      preview
                        .importData
                        .divisions[
                        division
                      ];

                    if (
                      results.length ===
                      0
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={
                          division
                        }
                        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <h2 className="text-lg font-semibold text-slate-900">
                          Division{" "}
                          {
                            division
                          }
                        </h2>

                        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                          <table className="min-w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                                  Place
                                </th>

                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                                  Player
                                </th>

                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                                  H&apos;cap
                                </th>

                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                                  Nett
                                </th>

                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                                  Gross
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {results.map(
                                (
                                  result,
                                ) => (
                                  <tr
                                    key={`${division}-${result.place}-${result.playerName}`}
                                  >
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                      {
                                        result.place
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-slate-900">
                                      {
                                        result.playerName
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-right text-slate-600">
                                      {
                                        result.handicap
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-right text-slate-600">
                                      {
                                        result.nett
                                      }
                                    </td>

                                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                      {
                                        result.gross
                                      }
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  },
                )}

                {preview.grossWinner && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Gross Winner
                    </p>

                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {
                            preview
                              .grossWinner
                              .playerName
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Nett{" "}
                          {
                            preview
                              .grossWinner
                              .nett
                          }{" "}
                          + handicap{" "}
                          {
                            preview
                              .grossWinner
                              .handicap
                          }{" "}
                          = gross{" "}
                          {
                            preview
                              .grossWinner
                              .gross
                          }
                        </p>
                      </div>

                      <p className="text-xl font-bold text-blue-700">
                        £10.00
                      </p>
                    </div>
                  </div>
                )}

                {preview.importData
                  .twosWinners
                  .length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Birdie 2s
                    </h2>

                    <div className="mt-4 grid gap-3">
                      {preview.importData.twosWinners.map(
                        (
                          winner,
                          index,
                        ) => (
                          <div
                            key={`${winner.playerName}-${index}`}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {
                                  winner.playerName
                                }
                              </p>

                              {winner.hole && (
                                <p className="text-xs text-slate-500">
                                  {
                                    winner.hole
                                  }{" "}
                                  hole
                                </p>
                              )}
                            </div>

                            <p className="font-bold text-slate-900">
                              £
                              {preview.calculation.twosIndividualPayout.toFixed(
                                2,
                              )}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Player Payouts
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Multiple prizes for
                    the same player are
                    combined into one
                    top-up for Kevin.
                  </p>

                  <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {preview.playerPayouts.map(
                      (
                        player,
                      ) => (
                        <div
                          key={
                            player.playerName
                          }
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {
                                player.playerName
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {player.awards
                                .map(
                                  (
                                    award,
                                  ) =>
                                    `${award.description} £${award.amount.toFixed(
                                      2,
                                    )}`,
                                )
                                .join(
                                  " + ",
                                )}
                            </p>
                          </div>

                          <p className="text-xl font-bold text-slate-900">
                            £
                            {player.amount.toFixed(
                              2,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Competition Summary
                  </h2>

                  <div className="mt-5 space-y-3">
                    <MoneyRow
                      label="Competition income"
                      value={
                        preview
                          .calculation
                          .competitionIncome
                      }
                    />

                    <MoneyRow
                      label="Prize fund"
                      value={
                        preview
                          .calculation
                          .prizeFund
                      }
                    />

                    <MoneyRow
                      label="Birdie 2s pot"
                      value={
                        preview
                          .calculation
                          .twosPot
                      }
                    />

                    <MoneyRow
                      label="Payment fees"
                      value={
                        preview
                          .calculation
                          .totalPaymentFees
                      }
                    />

                    <MoneyRow
                      label="Player top-ups"
                      value={
                        preview
                          .calculation
                          .totalPlayerPayout
                      }
                    />

                    <MoneyRow
                      label="Men's section payment"
                      value={
                        preview
                          .sectionPayment
                      }
                    />

                    <div className="border-t border-slate-200 pt-3">
                      <MoneyRow
                        label="Total payout"
                        value={
                          preview
                            .calculation
                            .totalNetPayout
                        }
                        bold
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Notes / committee
                      override
                    </label>

                    <textarea
                      value={notes}
                      onChange={(e) =>
                        setNotes(
                          e.target
                            .value,
                        )
                      }
                      rows={3}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>

                  {error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={
                      isPending ||
                      preview.errors
                        .length > 0
                    }
                    onClick={
                      handleSubmit
                    }
                    className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending
                      ? "Creating Payout..."
                      : "Create Competition Payout"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          bold
            ? "font-semibold text-slate-900"
            : "text-slate-600"
        }
      >
        {label}
      </span>

      <span
        className={
          bold
            ? "text-xl font-bold text-emerald-700"
            : "font-semibold text-slate-900"
        }
      >
        £{value.toFixed(2)}
      </span>
    </div>
  );
}