"use client";

import { useActionState } from "react";
import {
  importPastedTransactions,
  importTransactions,
  type ImportState,
} from "../actions";

const initialState: ImportState = {};

export default function ImportForm() {
  const [pasteState, pasteAction, pastePending] = useActionState(
    importPastedTransactions,
    initialState,
  );
  const [fileState, fileAction, filePending] = useActionState(
    importTransactions,
    initialState,
  );

  return (
    <div className="space-y-8">
      <form action={pasteAction} className="space-y-5">
        <div>
          <label htmlFor="pasteAccountCode" className="mb-2 block text-sm font-medium text-slate-700">
            Account
          </label>
          <select
            id="pasteAccountCode"
            name="accountCode"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="">Choose account</option>
            <option value="CLUB">Club Account</option>
            <option value="MENS">Men&apos;s Account</option>
          </select>
        </div>

        <div>
          <label htmlFor="pastedData" className="mb-2 block text-sm font-medium text-slate-700">
            Paste Lloyds transactions
          </label>
          <textarea
            id="pastedData"
            name="pastedData"
            required
            rows={14}
            placeholder="Copy the transactions from Lloyds and paste them here exactly as they appear..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Copy the transaction history straight from Lloyds, including the Date, Description, Type, In and Out columns. The balance lines and other Lloyds text are ignored automatically. Imported rows are left Uncategorised for you to allocate in Accounts.
          </p>
        </div>

        {pasteState.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {pasteState.error}
          </div>
        )}
        {pasteState.success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {pasteState.success}
          </div>
        )}

        <button
          type="submit"
          disabled={pastePending}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pastePending ? "Importing..." : "Import pasted transactions"}
        </button>
      </form>

      <div className="border-t border-slate-200 pt-7">
        <p className="mb-4 text-sm font-semibold text-slate-700">Or upload a CSV</p>
        <form action={fileAction} className="space-y-5">
          <div>
            <label htmlFor="fileAccountCode" className="mb-2 block text-sm font-medium text-slate-700">Account</label>
            <select id="fileAccountCode" name="accountCode" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900">
              <option value="">Choose account</option>
              <option value="CLUB">Club Account</option>
              <option value="MENS">Men&apos;s Account</option>
            </select>
          </div>
          <div>
            <label htmlFor="file" className="mb-2 block text-sm font-medium text-slate-700">Transaction CSV</label>
            <input id="file" name="file" type="file" accept=".csv,text/csv" required className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>
          {fileState.error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fileState.error}</div>}
          {fileState.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{fileState.success}</div>}
          <button type="submit" disabled={filePending} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
            {filePending ? "Importing..." : "Upload CSV"}
          </button>
        </form>
      </div>
    </div>
  );
}
