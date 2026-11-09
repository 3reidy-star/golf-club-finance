"use client";
import { useActionState, useState } from "react";
import type { StockItem } from "@/lib/annual-accounts";
import { saveYearEndReview, type ReviewState } from "./actions";
export default function ReviewForm({ accountCode, year, review }: { accountCode: string; year: number; review: { version: number; debtorsPence: number | null; otherCreditorsPence: number | null; stockConfirmed: boolean; stockItems: StockItem[]; commentary: string } | null }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(saveYearEndReview, {});
  const [count, setCount] = useState(Math.min(20, Math.max(3, (review?.stockItems.length ?? 0) + 1)));
  const pounds = (value: number | null | undefined) => value === null || value === undefined ? "" : (value / 100).toFixed(2);
  return <form action={action} className="space-y-6 rounded-xl border bg-white p-5">
    <input type="hidden" name="accountCode" value={accountCode} /><input type="hidden" name="year" value={year} /><input type="hidden" name="version" value={state.version ?? review?.version ?? 0} />
    <h2 className="text-xl font-bold">Other year-end balances</h2>
    <p>Enter zero to confirm none. Leave blank if still unknown. Charity and Juniors’ money are calculated separately; do not enter them again.</p>
    <div className="grid gap-4 sm:grid-cols-2"><label>Amounts owed to the account (£)<input name="debtors" type="number" min="0" step="0.01" defaultValue={pounds(review?.debtorsPence)} className="mt-1 block w-full rounded border p-2" /></label><label>Other amounts owed by the account (£)<input name="creditors" type="number" min="0" step="0.01" defaultValue={pounds(review?.otherCreditorsPence)} className="mt-1 block w-full rounded border p-2" /></label></div>
    <h2 className="text-xl font-bold">Stock held at 31 October {year}</h2>
    <p className="text-sm text-slate-600">Record only stock owned by this account at the year end. Enter the agreed unit valuation, excluding any amount belonging to the other account. Stock is shown as a non-cash asset; it does not increase available cash.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left"><thead><tr><th className="p-2">Description</th><th className="p-2">Quantity</th><th className="p-2">Unit value (£)</th></tr></thead><tbody>{Array.from({ length: count }, (_, i) => <tr key={i}><td className="p-2"><input aria-label={`Stock description ${i + 1}`} name={`description:${i}`} maxLength={150} defaultValue={review?.stockItems[i]?.description} className="w-full rounded border p-2" /></td><td className="p-2"><input aria-label={`Stock quantity ${i + 1}`} name={`quantity:${i}`} type="number" min="1" max="99999" step="1" defaultValue={review?.stockItems[i]?.quantity} className="w-24 rounded border p-2" /></td><td className="p-2"><input aria-label={`Stock unit value ${i + 1}`} name={`cost:${i}`} type="number" min="0" step="0.01" defaultValue={pounds(review?.stockItems[i]?.unitCostPence)} className="w-32 rounded border p-2" /></td></tr>)}</tbody></table></div>
    {count < 20 && <button type="button" onClick={() => setCount(value => Math.min(20, value + 1))} className="rounded border px-3 py-2">Add stock line</button>}
    <label className="flex gap-3"><input name="stockConfirmed" type="checkbox" defaultChecked={review?.stockConfirmed} /><span>Year-end stock count and values are confirmed. If there is no stock, leave all lines empty and tick this box.</span></label>
    <label className="block font-semibold">Treasurer’s commentary<textarea name="commentary" rows={5} maxLength={3000} defaultValue={review?.commentary} className="mt-2 block w-full rounded border p-3 font-normal" placeholder="Explain the main changes, notable expenditure and plans for the coming year." /></label>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}{state.success && <p role="status" className="text-emerald-800">{state.success}</p>}
    <button disabled={pending} className="rounded bg-emerald-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save year-end review"}</button>
  </form>;
}
