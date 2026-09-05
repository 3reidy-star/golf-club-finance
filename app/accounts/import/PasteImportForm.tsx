"use client";

import { useActionState } from "react";
import {
  importPastedTransactions,
  type ImportState,
} from "../actions";

const initialState: ImportState = {};

export default function PasteImportForm() {
  const [state, formAction, isPending] = useActionState(
    importPastedTransactions,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="pasteAccountCode"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
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
        <label
          htmlFor="pastedData"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Paste bank transactions
        </label>
        <textarea
          id="pastedData"
          name="pastedData"
          required
          rows={14}
          placeholder={"Date\tDescription\tAmount\n05/09/2026\tExample payment\t-25.00\n05/09/2026\tExample receipt\t40.00"}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-mono text-sm text-slate-900"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Copy the transaction table from online banking and paste it here, including the column headings. Tab-separated rows copied from a bank website or spreadsheet are supported, as well as comma-separated data. It needs Date and Description plus either Amount or Credit/Debit columns.
        </p>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {state.success}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Importing..." : "Import pasted transactions"}
      </button>
    </form>
  );
}
