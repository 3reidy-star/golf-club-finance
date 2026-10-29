"use client";

import { useActionState } from "react";
import {
  importTransactions,
  type ImportState,
} from "../actions";

const initialState: ImportState = {};

export default function ImportForm() {
  const [fileState, fileAction, filePending] = useActionState(
    importTransactions,
    initialState,
  );

  return (
    <div className="space-y-8">
      <div>
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
            <label htmlFor="file" className="mb-2 block text-sm font-medium text-slate-700">Transaction file</label>
            <input id="file" name="file" type="file" accept=".csv,.xls,text/csv,application/vnd.ms-excel" required className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>
          {fileState.error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fileState.error}</div>}
          {fileState.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{fileState.success}</div>}
          <button type="submit" disabled={filePending} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
            {filePending ? "Importing..." : "Upload transactions"}
          </button>
        </form>
      </div>
    </div>
  );
}
