"use client";
import { useActionState } from "react";
import { saveCashCount } from "./actions";

type Props = { accountCode: "MENS" | "CLUB"; name: string; year: number; amountPence: number | null; note: string; version: number };
export default function CashForm({ accountCode, name, year, amountPence, note, version }: Props) {
  const [state, action, pending] = useActionState(saveCashCount, {});
  return <form action={action} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">{name}</h2>
    <input type="hidden" name="accountCode" value={accountCode} /><input type="hidden" name="year" value={year} /><input type="hidden" name="version" value={state.version ?? version} />
    <label className="text-sm font-medium">Cash counted at 31 October {year} (£)<input name="amount" type="number" min="0" max="9999999.99" step="0.01" required defaultValue={amountPence === null ? "" : (amountPence / 100).toFixed(2)} placeholder="Enter amount, including 0.00" className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
    <label className="text-sm font-medium">Notes <span className="font-normal text-slate-500">(optional)</span><textarea name="note" maxLength={500} rows={2} defaultValue={note} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="text-sm text-emerald-700">{state.success}</p>}
    <button disabled={pending} className="w-fit rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save cash balance"}</button>
  </form>;
}
