"use client";
import { useActionState } from "react";
import { addManualTransaction, type ManualState } from "./actions";
import { ACCOUNT_CATEGORIES } from "../categories";
const initial: ManualState = {};
export default function ManualForm() {
 const [state, action, pending] = useActionState(addManualTransaction, initial);
 return <form action={action} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
 <label className="text-sm font-medium">Account<select required name="accountCode" className="mt-1 block w-full rounded border p-2"><option value="MENS">Men's Account</option><option value="CLUB">Club Account</option></select></label>
 <label className="text-sm font-medium">Transaction date<input required name="date" type="date" className="mt-1 block w-full rounded border p-2"/></label>
 <label className="text-sm font-medium">Direction<select name="direction" className="mt-1 block w-full rounded border p-2"><option value="IN">Money in</option><option value="OUT">Money out</option></select></label>
 <label className="text-sm font-medium">Amount (£)<input required name="amount" type="number" min="0.01" step="0.01" className="mt-1 block w-full rounded border p-2"/></label>
 <label className="text-sm font-medium">Bank description<input required name="description" maxLength={500} className="mt-1 block w-full rounded border p-2"/></label>
 <label className="text-sm font-medium">Category<select required name="category" className="mt-1 block w-full rounded border p-2">{ACCOUNT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
 {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
 {state.success && <p role="status" className="text-sm text-emerald-700">{state.success}</p>}
 <button disabled={pending} className="rounded bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending?"Saving…":"Save transaction"}</button>
 </form>;
}