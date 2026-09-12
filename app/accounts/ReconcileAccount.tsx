"use client";

import { useMemo, useState } from "react";

type Props = {
  accountName: string;
  ledgerBalance: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export default function ReconcileAccount({ accountName, ledgerBalance }: Props) {
  const [open, setOpen] = useState(false);
  const [bankBalance, setBankBalance] = useState("");

  const parsedBankBalance = Number(bankBalance.replace(/,/g, ""));
  const hasBankBalance = bankBalance.trim() !== "" && Number.isFinite(parsedBankBalance);

  const difference = useMemo(
    () => (hasBankBalance ? Math.round((parsedBankBalance - ledgerBalance) * 100) / 100 : 0),
    [hasBankBalance, parsedBankBalance, ledgerBalance],
  );

  const reconciled = hasBankBalance && Math.abs(difference) < 0.005;

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        {open ? "Close reconciliation" : "Reconcile"}
      </button>

      {open && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">{accountName} reconciliation</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">App balance</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{money(ledgerBalance)}</p>
            </div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Bank balance
              <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white">
                <span className="px-2 text-sm text-slate-500">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={bankBalance}
                  onChange={(event) => setBankBalance(event.target.value)}
                  placeholder="0.00"
                  className="min-w-0 flex-1 rounded-r-md px-2 py-1.5 text-sm text-slate-900 outline-none"
                />
              </div>
            </label>
          </div>

          {hasBankBalance && (
            <div className={`mt-3 rounded-md border p-3 ${reconciled ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <p className={`text-xs font-bold ${reconciled ? "text-emerald-800" : "text-red-800"}`}>
                {reconciled ? "Reconciled — balances match" : `Difference ${money(difference)}`}
              </p>
              {!reconciled && (
                <p className="mt-1 text-[11px] text-red-700">
                  The bank balance is {difference > 0 ? "higher" : "lower"} than the app by {money(Math.abs(difference))}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
