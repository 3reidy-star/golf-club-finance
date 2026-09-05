"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  createPayoutRequest,
} from "./actions";

type SectionOption = {
  code: string;
  name: string;
};

type PlayerTopUp = {
  id: string;
  playerName: string;
  amount: string;
};

type Props = {
  sections: SectionOption[];
  initialSectionCode: string;
  lockedSection: boolean;
  sectionName: string;
};

export default function PayoutForm({
  sections,
  initialSectionCode,
  lockedSection,
  sectionName,
}: Props) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    sectionCode,
    setSectionCode,
  ] = useState(
    initialSectionCode,
  );

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    calculationType,
    setCalculationType,
  ] = useState<
    "PLAYERS_X_FEE" | "MANUAL_AMOUNT"
  >("PLAYERS_X_FEE");

  const [
    players,
    setPlayers,
  ] = useState("21");

  const [
    amountPerPlayer,
    setAmountPerPlayer,
  ] = useState("1");

  const [
    manualAmount,
    setManualAmount,
  ] = useState("");

  const [
    playerTopUps,
    setPlayerTopUps,
  ] = useState<PlayerTopUp[]>(
    [],
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    success,
    setSuccess,
  ] = useState<string | null>(
    null,
  );

  const calculation =
    useMemo(() => {
      let gross = 0;

      if (
        calculationType ===
        "PLAYERS_X_FEE"
      ) {
        gross =
          (Number(players) || 0) *
          (Number(
            amountPerPlayer,
          ) || 0);
      } else {
        gross =
          Number(
            manualAmount,
          ) || 0;
      }

      gross =
        Math.round(
          gross * 100,
        ) / 100;

      const fee =
        Math.round(
          gross *
            0.04 *
            100,
        ) / 100;

      const net =
        Math.round(
          (gross - fee) *
            100,
        ) / 100;

      const playerTopUpTotal =
        Math.round(
          playerTopUps.reduce(
            (
              total,
              player,
            ) =>
              total +
              (Number(
                player.amount,
              ) || 0),
            0,
          ) * 100,
        ) / 100;

      const sectionPayment =
        Math.round(
          (net -
            playerTopUpTotal) *
            100,
        ) / 100;

      return {
        gross,
        fee,
        net,
        playerTopUpTotal,
        sectionPayment,
      };
    }, [
      calculationType,
      players,
      amountPerPlayer,
      manualAmount,
      playerTopUps,
    ]);

  function addPlayerTopUp() {
    setPlayerTopUps(
      (current) => [
        ...current,
        {
          id:
            crypto.randomUUID(),
          playerName: "",
          amount: "",
        },
      ],
    );
  }

  function updatePlayer(
    id: string,
    field:
      | "playerName"
      | "amount",
    value: string,
  ) {
    setPlayerTopUps(
      (current) =>
        current.map(
          (player) =>
            player.id === id
              ? {
                  ...player,
                  [field]: value,
                }
              : player,
        ),
    );
  }

  function removePlayer(
    id: string,
  ) {
    setPlayerTopUps(
      (current) =>
        current.filter(
          (player) =>
            player.id !== id,
        ),
    );
  }

  function resetForm() {
    setReason("");
    setPlayers("21");
    setAmountPerPlayer("1");
    setManualAmount("");
    setPlayerTopUps([]);
    setCalculationType(
      "PLAYERS_X_FEE",
    );
  }

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (
      calculation.sectionPayment <
      0
    ) {
      setError(
        "Player top-ups cannot exceed the amount available after the 4% payment fee.",
      );

      return;
    }

    startTransition(
      async () => {
        try {
          const result =
            await createPayoutRequest(
              {
                sectionCode,
                reason,
                calculationType,

                players:
                  calculationType ===
                  "PLAYERS_X_FEE"
                    ? Number(
                        players,
                      )
                    : undefined,

                amountPerPlayer:
                  calculationType ===
                  "PLAYERS_X_FEE"
                    ? Number(
                        amountPerPlayer,
                      )
                    : undefined,

                manualAmount:
                  calculationType ===
                  "MANUAL_AMOUNT"
                    ? Number(
                        manualAmount,
                      )
                    : undefined,

                playerTopUps:
                  playerTopUps.map(
                    (player) => ({
                      playerName:
                        player.playerName,
                      amount:
                        Number(
                          player.amount,
                        ),
                    }),
                  ),
              },
            );

          setSuccess(
            `Request ${result.reference} submitted successfully.`,
          );

          resetForm();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to create payout request.",
          );
        }
      },
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        {lockedSection && (
          <div className="mb-6 flex flex-wrap gap-3">
            <a
              href="/payouts/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              New payout request
            </a>

            <a
              href="/payouts/completed"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Completed payouts
            </a>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {sectionName}
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              New payout request
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Submit a payout request.
              The 4% payment fee is
              deducted automatically.
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-900">
                Request submitted
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                {success}
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                It is now awaiting
                Treasurer approval.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Section
              </label>

              {lockedSection ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-semibold text-slate-900">
                  {sectionName}
                </div>
              ) : (
                <select
                  value={
                    sectionCode
                  }
                  onChange={(e) =>
                    setSectionCode(
                      e.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  {sections.map(
                    (section) => (
                      <option
                        key={
                          section.code
                        }
                        value={
                          section.code
                        }
                      >
                        {
                          section.name
                        }
                      </option>
                    ),
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Reason / competition
              </label>

              <input
                value={reason}
                onChange={(e) =>
                  setReason(
                    e.target.value,
                  )
                }
                placeholder="e.g. Wednesday Competition"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Calculation
              </label>

              <select
                value={
                  calculationType
                }
                onChange={(e) =>
                  setCalculationType(
                    e.target
                      .value as
                      | "PLAYERS_X_FEE"
                      | "MANUAL_AMOUNT",
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="PLAYERS_X_FEE">
                  Players × entry fee
                </option>

                <option value="MANUAL_AMOUNT">
                  Manual amount
                </option>
              </select>
            </div>

            {calculationType ===
            "PLAYERS_X_FEE" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Players
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={players}
                    onChange={(e) =>
                      setPlayers(
                        e.target
                          .value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Amount per player
                  </label>

                  <div className="flex rounded-lg border border-slate-300">
                    <span className="flex items-center px-3 text-slate-500">
                      £
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        amountPerPlayer
                      }
                      onChange={(e) =>
                        setAmountPerPlayer(
                          e.target
                            .value,
                        )
                      }
                      className="w-full rounded-r-lg px-3 py-2 outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Amount received
                </label>

                <div className="flex rounded-lg border border-slate-300">
                  <span className="flex items-center px-3 text-slate-500">
                    £
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      manualAmount
                    }
                    onChange={(e) =>
                      setManualAmount(
                        e.target
                          .value,
                      )
                    }
                    className="w-full rounded-r-lg px-3 py-2 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Money
                  label="Gross"
                  value={
                    calculation.gross
                  }
                />

                <Money
                  label="4% fee"
                  value={
                    calculation.fee
                  }
                />

                <Money
                  label="Available"
                  value={
                    calculation.net
                  }
                  highlight
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Player top-ups
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add any individual
                    player accounts that
                    Kevin needs to top
                    up.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    addPlayerTopUp
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Add player
                </button>
              </div>

              {playerTopUps.length >
                0 && (
                <div className="mt-5 space-y-3">
                  {playerTopUps.map(
                    (player) => (
                      <div
                        key={
                          player.id
                        }
                        className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[1fr_140px_auto]"
                      >
                        <input
                          value={
                            player.playerName
                          }
                          onChange={(
                            e,
                          ) =>
                            updatePlayer(
                              player.id,
                              "playerName",
                              e.target
                                .value,
                            )
                          }
                          placeholder="Player name"
                          className="rounded-lg border border-slate-300 px-3 py-2"
                        />

                        <div className="flex rounded-lg border border-slate-300">
                          <span className="flex items-center px-3 text-slate-500">
                            £
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              player.amount
                            }
                            onChange={(
                              e,
                            ) =>
                              updatePlayer(
                                player.id,
                                "amount",
                                e.target
                                  .value,
                              )
                            }
                            className="w-full rounded-r-lg px-3 py-2 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removePlayer(
                              player.id,
                            )
                          }
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900">
                Payment breakdown
              </h2>

              <div className="mt-4 space-y-3">
                <BreakdownRow
                  label="Player top-ups — Kevin"
                  value={
                    calculation.playerTopUpTotal
                  }
                />

                <BreakdownRow
                  label={`${sectionName} section payment — Treasurer`}
                  value={
                    calculation.sectionPayment
                  }
                />

                <div className="border-t border-slate-200 pt-3">
                  <BreakdownRow
                    label="Total payout"
                    value={
                      calculation.net
                    }
                    bold
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={
                isPending ||
                calculation
                  .sectionPayment < 0
              }
              onClick={
                handleSubmit
              }
              className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "Submitting..."
                : "Submit Payout Request"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Money({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${
          highlight
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        £{value.toFixed(2)}
      </p>
    </div>
  );
}

function BreakdownRow({
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
