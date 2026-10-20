"use client";
import { useActionState } from "react";
import { addAccountCategory } from "./actions";
export default function AddCategoryForm() {
  const [state, action, pending] = useActionState(addAccountCategory, {});
  return <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer text-sm font-semibold text-emerald-800">+ Add category</summary><p className="mt-2 text-xs text-slate-500">Available for both Club and Men&apos;s accounts, including manual transactions and reports.</p><form action={action} className="mt-3 flex flex-wrap items-end gap-3"><label className="grow text-xs font-medium text-slate-700">Category name<input required name="name" maxLength={80} placeholder="e.g. Open Day Costs" className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm" /></label><button disabled={pending} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Adding…" : "Add category"}</button>{state.error && <p role="alert" className="w-full text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="w-full text-sm text-emerald-700">{state.success}</p>}</form></details>;
}
