import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CATEGORIES } from "../categories";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  account?: string;
  year?: string;
}>;

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export default async function AccountsSummaryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TREASURER") redirect("/");

  const params = await searchParams;
  const requestedYear = Number(params.year);
  const currentYear = new Date().getUTCFullYear();
  const year = Number.isFinite(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
    ? requestedYear
    : currentYear;
  const accountFilter = params.account === "CLUB" || params.account === "MENS"
    ? params.account
    : "ALL";

  const accounts = await prisma.financeAccount.findMany({
    include: {
      transactions: {
        orderBy: { transactionDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const allTransactions = accounts.flatMap((account) =>
    account.transactions.map((transaction) => ({
      ...transaction,
      accountCode: account.code,
      accountName: account.name,
      openingBalance: Number(account.openingBalance),
    })),
  );

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const relevantAccounts = accountFilter === "ALL"
    ? accounts
    : accounts.filter((account) => account.code === accountFilter);

  const accountCodes = new Set(relevantAccounts.map((account) => account.code));
  const yearTransactions = allTransactions.filter(
    (row) => accountCodes.has(row.accountCode) && row.transactionDate >= start && row.transactionDate < end,
  );

  const openingBalance = relevantAccounts.reduce((total, account) => {
    const priorMovement = account.transactions
      .filter((row) => row.transactionDate < start)
      .reduce((sum, row) => sum + Number(row.credit) - Number(row.debit), 0);
    return total + Number(account.openingBalance) + priorMovement;
  }, 0);

  const categoryRows = ACCOUNT_CATEGORIES.map((category) => {
    const rows = yearTransactions.filter((row) => row.category === category);
    const credit = rows.reduce((total, row) => total + Number(row.credit), 0);
    const debit = rows.reduce((total, row) => total + Number(row.debit), 0);
    return { category, credit, debit, net: credit - debit };
  }).filter((row) => row.credit !== 0 || row.debit !== 0 || row.category === "Uncategorised");

  const totalCredit = yearTransactions.reduce((total, row) => total + Number(row.credit), 0);
  const totalDebit = yearTransactions.reduce((total, row) => total + Number(row.debit), 0);
  const closingBalance = openingBalance + totalCredit - totalDebit;

  const years = Array.from(
    new Set(
      allTransactions.map((row) => row.transactionDate.getUTCFullYear()),
    ),
  ).sort((a, b) => b - a);

  if (!years.includes(currentYear)) years.unshift(currentYear);
  if (!years.includes(year)) years.unshift(year);

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <a href="/accounts" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              ← Transaction history
            </a>
            <a href="/accounts/import" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Import transactions
            </a>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Treasurer only</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Annual accounts summary</h1>
          <p className="mt-2 text-slate-600">
            Year and category summary based on the Summary and AGM-style views in the existing workbook.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <label className="text-sm font-medium text-slate-700">
              Account
              <select name="account" defaultValue={accountFilter} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="ALL">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.code} value={account.code}>{account.name}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Year
              <select name="year" defaultValue={String(year)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                {years.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Apply
            </button>
          </form>
        </section>

        {allTransactions.length === 0 ? (
          <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-semibold text-amber-900">No transactions uploaded yet</h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              This summary is ready, but it will remain empty until the Club and Men&apos;s transaction history is imported. Once those files are loaded, the annual figures and category totals will calculate automatically.
            </p>
            <a href="/accounts/import" className="mt-4 inline-block rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white">
              Import transaction history
            </a>
          </section>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Opening balance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{money(openingBalance)}</p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Income</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{money(totalCredit)}</p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Expenditure</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{money(totalDebit)}</p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Closing balance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{money(closingBalance)}</p>
              </section>
            </div>

            <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Category summary</h2>
                <p className="mt-1 text-sm text-slate-500">{yearTransactions.length} transactions in {year}.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Credit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryRows.map((row) => (
                      <tr key={row.category} className={row.category === "Uncategorised" ? "bg-amber-50" : ""}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.category}</td>
                        <td className="px-4 py-3 text-right text-sm text-emerald-700">{row.credit ? money(row.credit) : "-"}</td>
                        <td className="px-4 py-3 text-right text-sm text-red-700">{row.debit ? money(row.debit) : "-"}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{money(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{money(totalCredit)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{money(totalDebit)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{money(totalCredit - totalDebit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
