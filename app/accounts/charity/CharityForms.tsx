"use client";
import { useActionState } from "react";
import { addCharityContribution, allocateCategorisedReceipts, allocateCharity, removeCharityAllocation } from "./actions";

type Option = { id: string; label: string };
export function AllocateForm({ type, options }: { type: "RECEIPT" | "COST" | "PAYMENT"; options: Option[] }) {
  const [state, action, pending] = useActionState(allocateCharity, {});
  return <form action={action} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="font-semibold">{type === "RECEIPT" ? "Allocate charity money received" : type === "COST" ? "Allocate charity fundraising costs" : "Allocate payment to the charity"}</h3>
    <input type="hidden" name="type" value={type} />
    <label className="text-sm">Bank transaction<select name="transactionId" required defaultValue="" className="mt-1 block w-full rounded border p-2"><option value="">Select a transaction</option>{options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label className="text-sm">Amount to allocate (£)<input name="amount" type="number" min="0.01" max="9999999.99" step="0.01" required className="mt-1 block w-full rounded border p-2" /></label>
    <p className="text-xs text-slate-500">Allocate only the charity portion. The bank transaction remains unchanged.</p>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="text-sm text-emerald-700">{state.success}</p>}
    <button disabled={pending || !options.length} className="w-fit rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save allocation"}</button>
  </form>;
}
export function RemoveForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeCharityAllocation, {});
  return <form action={action} className="mt-2 flex flex-wrap gap-2" onSubmit={e => { if (!window.confirm("Remove this charity entry? The correction will be retained in the audit history.")) e.preventDefault(); }}>
    <input type="hidden" name="id" value={id} /><input name="reason" required maxLength={500} placeholder="Reason for removal" aria-label="Reason for removal" className="rounded border px-2 py-1 text-xs" />
    <button disabled={pending} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">{pending ? "Removing…" : "Remove entry"}</button>
    {state.error && <p role="alert" className="w-full text-xs text-red-700">{state.error}</p>}
  </form>;
}

export function ContributionForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addCharityContribution, {});
  return <details className="mt-4 rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">Add another section contribution</summary><form action={action} className="mt-4 grid gap-3 md:grid-cols-3">
    <label className="text-sm">Decision date<input type="date" name="date" defaultValue={today} required className="mt-1 block w-full rounded border p-2" /></label>
    <label className="text-sm">Description<input name="description" required maxLength={250} className="mt-1 block w-full rounded border p-2" /></label>
    <label className="text-sm">Amount (£)<input type="number" name="amount" min="0.01" max="9999999.99" step="0.01" required className="mt-1 block w-full rounded border p-2" /></label>
    <p className="text-xs text-slate-500 md:col-span-3">For a commitment from section funds; this is not a bank transaction.</p>
    {state.error && <p role="alert" className="text-sm text-red-700 md:col-span-3">{state.error}</p>}{state.success && <p role="status" className="text-sm text-emerald-700 md:col-span-3">{state.success}</p>}
    <button disabled={pending} className="w-fit rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save contribution"}</button>
  </form></details>;
}

export function AllocateCategorisedForm({ ids, amountPence, amount }: { ids: string[]; amountPence: number; amount: string }) {
  const count = ids.length;
  const [state, action, pending] = useActionState(allocateCategorisedReceipts, {});
  return <form action={action} className="mt-3" onSubmit={e => { if (!window.confirm(`Allocate ${count} bank receipts totalling ${amount} to Thommo’s Charity?`)) e.preventDefault(); }}>
    {ids.map(id => <input key={id} type="hidden" name="transactionId" value={id} />)}<input type="hidden" name="expectedPence" value={amountPence} />
    <p className="text-sm">{count} unallocated money-in transaction{count === 1 ? "" : "s"} categorised Thommo Charity: <strong>{amount}</strong>.</p>
    <button disabled={pending || !count} className="mt-2 rounded bg-amber-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Allocate these charity receipts"}</button>
    {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="mt-2 text-sm text-emerald-700">{state.success}</p>}
  </form>;
}
