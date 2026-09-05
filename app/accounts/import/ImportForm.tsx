"use client";

import { useActionState } from "react";
import { importTransactions, type ImportState } from "../actions";

const initialState: ImportState = {};

export default function ImportForm() {
  const [state, formAction, isPending] = useActionState(importTransactions, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="accountCode" className="mb-2 block text-sm font-medium text-slate-700">Account</label>
        <select id="accountCode" name="accountCode" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900">
          <option value="">Choose account</option>
          <option value="CLUB">Club Account</option>
          <option value="MENS">Men&apos;s Account</option>
        </select>
      </div>

      <div>
        <label htmlFor="file" className="mb-2 block text-sm font-medium text-slate-700">Transaction CSV</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          The file needs Date and Description plus either Amount or Credit/Debit columns. Bank exports can be uploaded without a category; those rows will be marked Uncategorised for you to review.
        </p>
      </div>

      {state.error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{state.error}</div>}
      {state.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{state.success}</div>}

      <button type="submit" disabled={isPending} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {isPending ? "Importing..." : "Import transactions"}
      </button>
    </form>
  );
}
