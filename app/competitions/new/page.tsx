"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildMensCompetitionPreview } from "@/lib/mensCompetitionPreview";
import { createMensCompetitionFromImport, createMensCompetitionManual } from "./actions";

export default function NewCompetitionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"import" | "manual">("import");
  const [divisionCount, setDivisionCount] = useState<1 | 2 | 3>(1);
  const [manualLines, setManualLines] = useState([{ playerName: "", reason: "", amount: "" }]);
  const [manualSectionPayment, setManualSectionPayment] = useState("");
  const [name, setName] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");
  const [entrants, setEntrants] = useState("");
  const [entryFee, setEntryFee] = useState("5");
  const [intelligentGolfText, setIntelligentGolfText] = useState("");
  const [divisionTexts, setDivisionTexts] = useState(["", "", ""]);
  const [grossResultsText, setGrossResultsText] = useState("");
  const [twosPaidText, setTwosPaidText] = useState("");
  const [twosWinnersText, setTwosWinnersText] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const entrantCount = Number(entrants) || 0;
  const preview = useMemo(() => {
    if (!divisionTexts[0]?.trim()) return null;

    return buildMensCompetitionPreview({
      rawText: intelligentGolfText,
      divisionTexts: divisionTexts.slice(0, divisionCount),
      grossResultsText,
      twosPaidText,
      twosWinnersText,
      entrants: entrantCount,
      entryFee: Number(entryFee) || 5,
      divisionCount,
      twosEntrantsOverride: null,
      twosWinnersPresent: null,
    });
  }, [
    intelligentGolfText,
    divisionTexts,
    grossResultsText,
    twosPaidText,
    twosWinnersText,
    entrantCount,
    entryFee,
    divisionCount,
  ]);

  useEffect(() => {
    if (!competitionDate && preview?.importData.detectedDate) {
      setCompetitionDate(preview.importData.detectedDate);
    }
  }, [preview, competitionDate]);

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        await createMensCompetitionFromImport({
          name,
          competitionDate,
          entrants: entrantCount,
          entryFee: Number(entryFee),
          intelligentGolfText,
          divisionTexts: divisionTexts.slice(0, divisionCount),
          grossResultsText,
          twosPaidText,
          twosWinnersText,
          divisionCount,
          twosEntrantsOverride: null,
          twosWinnersPresent: null,
          notes,
        });

        router.push("/payouts/approval");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to create the competition payout.",
        );
      }
    });
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
            Intelligent Golf Competition Import
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Paste the competition results from Intelligent Golf and the system will calculate the payouts.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">How do you want to create the payout?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={() => setMode("import")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "import" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Import from Intelligent Golf</button>
            <button type="button" onClick={() => setMode("manual")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "manual" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Manual payout</button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Competition Details</h2>
              <div className="mt-5 space-y-5">
                <Field label="Competition name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monthly Medal"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </Field>

                <Field label="Competition date">
                  <input
                    type="date"
                    value={competitionDate}
                    onChange={(e) => setCompetitionDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Total entrants">
                    <input
                      type="number"
                      min="1"
                      value={entrants}
                      onChange={(e) => setEntrants(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </Field>

                  <Field label="Entry fee">
                    <input
                      type="number"
                      step="0.01"
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </Field>
                </div>
                {mode === "import" && (
                  <Field label="Number of divisions">
                    <select value={divisionCount} onChange={(e) => setDivisionCount(Number(e.target.value) as 1 | 2 | 3)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                      <option value={1}>1 division</option>
                      <option value={2}>2 divisions</option>
                      <option value={3}>3 divisions</option>
                    </select>
                  </Field>
                )}
              </div>
            </section>



            {mode === "import" && (
              <div className="space-y-6">
                {Array.from({ length: divisionCount }, (_, index) => (
                  <section key={index} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Division {index + 1} results</h2>
                    <p className="mt-1 text-sm text-slate-500">Paste only the results table for this division.</p>
                    <textarea
                      value={divisionTexts[index]}
                      onChange={(e) => setDivisionTexts((values) => values.map((value, i) => i === index ? e.target.value : value))}
                      rows={10}
                      placeholder={`Paste Division ${index + 1} results here...`}
                      className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm text-slate-900"
                    />
                  </section>
                ))}

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Gross results</h2>
                  <p className="mt-1 text-sm text-slate-500">Paste the Gross results table from Intelligent Golf. Leave blank if this competition has no Gross prize.</p>
                  <textarea value={grossResultsText} onChange={(e) => setGrossResultsText(e.target.value)} rows={7} placeholder="Paste Gross results here..." className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Birdie 2s entrants</h2>
                  <p className="mt-1 text-sm font-medium text-amber-700">Paste ONLY the players who paid into the Birdie 2s. Do not paste the non-payers list. Leave blank for no 2s pot.</p>
                  <textarea value={twosPaidText} onChange={(e) => setTwosPaidText(e.target.value)} rows={7} placeholder="Paste players who paid into Birdie 2s..." className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Birdie 2s winners</h2>
                  <p className="mt-1 text-sm text-slate-500">Paste the Birdie 2 winner table/details. Leave blank if there were no winners.</p>
                  <textarea value={twosWinnersText} onChange={(e) => setTwosWinnersText(e.target.value)} rows={7} placeholder="Paste Birdie 2 winners here..." className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm" />
                </section>
              </div>
            )}

            {mode === "manual" && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Manual player payouts</h2>
                <div className="mt-4 space-y-3">
                  {manualLines.map((line, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_110px]">
                      <input placeholder="Player name" value={line.playerName} onChange={(e) => setManualLines((lines) => lines.map((item, i) => i === index ? {...item, playerName: e.target.value} : item))} className="rounded-lg border px-3 py-2 text-sm" />
                      <input placeholder="Prize / reason" value={line.reason} onChange={(e) => setManualLines((lines) => lines.map((item, i) => i === index ? {...item, reason: e.target.value} : item))} className="rounded-lg border px-3 py-2 text-sm" />
                      <input type="number" step="0.01" placeholder="£" value={line.amount} onChange={(e) => setManualLines((lines) => lines.map((item, i) => i === index ? {...item, amount: e.target.value} : item))} className="rounded-lg border px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setManualLines((lines) => [...lines, {playerName:"",reason:"",amount:""}])} className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold">+ Add payout</button>
                <Field label="Men's Section payment"><input type="number" step="0.01" min="0" value={manualSectionPayment} onChange={(e) => setManualSectionPayment(e.target.value)} className="w-full rounded-lg border px-3 py-2" /></Field>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {mode === "manual" ? (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Manual payout summary</h2>
                {(() => { const income=(Number(entrants)||0)*(Number(entryFee)||0); const players=manualLines.reduce((s,l)=>s+(Number(l.amount)||0),0); const section=Number(manualSectionPayment)||0; const difference=income-players-section; return <div className="mt-5 space-y-3"><MoneyRow label="Competition income" value={income}/><MoneyRow label="Player payouts" value={players}/><MoneyRow label="Men's section payment" value={section}/><MoneyRow label="Difference" value={difference} bold/></div>; })()}
                <Field label="Notes"><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2"/></Field>
                {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                <button type="button" disabled={isPending} onClick={() => { setError(null); startTransition(async()=>{ try { await createMensCompetitionManual({name,competitionDate,entrants:entrantCount,entryFee:Number(entryFee),playerPayouts:manualLines.map(l=>({playerName:l.playerName,reason:l.reason,amount:Number(l.amount)})),sectionPayment:Number(manualSectionPayment)||0,notes}); router.push("/payouts/approval"); router.refresh(); } catch(err){setError(err instanceof Error?err.message:"Unable to create payout.");}}); }} className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{isPending?"Creating Payout...":"Create Manual Competition Payout"}</button>
              </section>
            ) : !preview ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-lg font-semibold text-slate-900">
                  Paste the Intelligent Golf information to begin
                </p>
              </div>
            ) : (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Import Summary</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Summary label="Results recognised" value={String(preview.importData.players.length)} />
                    <Summary label="Birdie 2s entrants" value={String(preview.calculation.twosEntrants)} />
                    <Summary label="Birdie 2s winners" value={String(preview.calculation.twosWinners)} />
                    <Summary label="2s entry" value={`£${preview.importData.twosEntryFee.toFixed(2)}`} />
                  </div>
                </section>

                {preview.errors.length > 0 && (
                  <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="font-semibold text-red-900">Import needs attention</p>
                    <ul className="mt-3 space-y-2 text-sm text-red-700">
                      {preview.errors.map((message, index) => (
                        <li key={index}>• {message}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {preview.warnings.length > 0 && (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <p className="font-semibold text-amber-900">Import warnings</p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-800">
                      {preview.warnings.map((message, index) => (
                        <li key={index}>• {message}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {[1, 2, 3].map((division) => {
                  const results = preview.importData.divisions[division];
                  if (!results.length) return null;

                  return (
                    <section key={division} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h2 className="text-lg font-semibold text-slate-900">Division {division}</h2>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                              <th className="px-3 py-2">Place</th>
                              <th className="px-3 py-2">Player</th>
                              <th className="px-3 py-2">H&apos;cap</th>
                              <th className="px-3 py-2">Nett</th>
                              <th className="px-3 py-2">Gross</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((result) => (
                              <tr key={`${division}-${result.place}-${result.playerName}`} className="border-b border-slate-100">
                                <td className="px-3 py-2">{result.place}</td>
                                <td className="px-3 py-2 font-medium">{result.playerName}</td>
                                <td className="px-3 py-2">{result.handicap}</td>
                                <td className="px-3 py-2">{result.nett}</td>
                                <td className="px-3 py-2">{result.gross}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}

                {preview.calculation.twosWinners > 0 && (
                  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Birdie 2s</h2>
                    <div className="mt-4 space-y-2">
                      {preview.importData.twosWinners.map((winner, index) => (
                        <div key={`${winner.playerName}-${index}`} className="flex justify-between rounded-lg bg-slate-50 px-4 py-3">
                          <span className="font-medium">{winner.playerName}</span>
                          <span className="font-bold">£{preview.calculation.twosIndividualPayout.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Player Payouts</h2>
                  <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {preview.playerPayouts.map((player) => (
                      <div key={player.playerName} className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <p className="font-semibold">{player.playerName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {player.awards.map((award) => `${award.description} £${award.amount.toFixed(2)}`).join(" + ")}
                          </p>
                        </div>
                        <p className="text-lg font-bold">£{player.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Competition Summary</h2>
                  <div className="mt-5 space-y-3">
                    <MoneyRow label="Competition income" value={preview.calculation.competitionIncome} />
                    <MoneyRow label="Prize fund" value={preview.calculation.prizeFund} />
                    <MoneyRow label="Birdie 2s pot" value={preview.calculation.twosPot} />
                    <MoneyRow label="Payment fees" value={preview.calculation.totalPaymentFees} />
                    <MoneyRow label="Player top-ups" value={preview.calculation.totalPlayerPayout} />
                    <MoneyRow label="Men's section payment" value={preview.sectionPayment} />
                    <div className="border-t border-slate-200 pt-3">
                      <MoneyRow label="Total payout" value={preview.calculation.totalNetPayout} bold />
                    </div>
                  </div>

                  <Field label="Notes / committee override">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </Field>

                  {error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      isPending ||
                      preview.errors.length > 0 ||
                      false
                    }
                    className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {isPending ? "Creating Payout..." : "Create Competition Payout"}
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MoneyRow({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={bold ? "font-semibold text-slate-900" : "text-slate-600"}>{label}</span>
      <span className={bold ? "text-xl font-bold text-emerald-700" : "font-semibold text-slate-900"}>
        £{value.toFixed(2)}
      </span>
    </div>
  );
}
