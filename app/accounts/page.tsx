import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateTransactionCategory } from "./actions";
import { ACCOUNT_CATEGORIES } from "./categories";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  account?: string;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  type?: string;
}>;

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function parseFilterDate(value: string | undefined, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TREASURER") redirect("/");

  const params = await searchParams;
  const accountFilter = params.account ?? "ALL";
  const categoryFilter = params.category ?? "ALL";
  const typeFilter = params.type ?? "ALL";
  const searchFilter = (params.search ?? "").trim().toLowerCase();
  const fromDate = parseFilterDate(params.from);
  const toDate = parseFilterDate(params.to, true);

  const accounts = await prisma.financeAccount.findMany({
    include: {
      transactions: {
        orderBy: [
          { transactionDate: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
    orderBy: { name: "asc" },
  });

  const accountBalanceByCode = new Map<string, number>();
  const rowsWithBalance = accounts.flatMap((account) => {
    let runningBalance = Number(account.openingBalance);

    const rows = account.transactions.map((transaction) => {
      runningBalance += Number(transaction.credit) - Number(transaction.debit);

      return {
        ...transaction,
        accountName: account.name,
        accountCode: account.code,
        runningBalance,
      };
    });

    accountBalanceByCode.set(account.code, runningBalance);
    return rows;
  });

  const filteredRows = rowsWithBalance
    .filter((row) => {
      if (accountFilter !== "ALL" && row.accountCode !== accountFilter) return false;
      if (categoryFilter !== "ALL" && row.category !== categoryFilter) return false;
      if (typeFilter === "CREDIT" && Number(row.credit) === 0) return false;
      if (typeFilter === "DEBIT" && Number(row.debit) === 0) return false;
      if (fromDate && row.transactionDate < fromDate) return false;
      if (toDate && row.transactionDate > toDate) return false;
      if (searchFilter && !row.description.toLowerCase().includes(searchFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      const dateDiff = b.transactionDate.getTime() - a.transactionDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const uncategorised = filteredRows.filter(
    (row) => row.category === "Uncategorised",
  ).length;

  const filteredCredit = filteredRows.reduce(
    (total, row) => total + Number(row.credit),
    0,
  );
  const filteredDebit = filteredRows.reduce(
    (total, row) => total + Number(row.debit),
    0,
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Dashboard
          </a>

          <a
            href="/accounts/import"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Import transactions
          </a>
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Treasurer only
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Accounts
          </h1>
          <p className="mt-2 text-slate-600">
            Full Club and Men&apos;s transactional history with spreadsheet-style filtering and categorisation.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {accounts.map((account) => (
            <section
              key={account.code}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-500">
                {account.name}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {money(accountBalanceByCode.get(account.code) ?? Number(account.openingBalance))}
              </p>
              <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-500">
                <span>{account.transactions.length} transactions</span>
                <span>Opening {money(Number(account.openingBalance))}</span>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Transaction filters
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter the ledger in the same way you would work through the spreadsheet tabs.
            </p>
          </div>

          <form method="get" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <label className="text-sm font-medium text-slate-700">
              Account
              <select
                name="account"
                defaultValue={accountFilter}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Category
              <select
                name="category"
                defaultValue={categoryFilter}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">All categories</option>
                {ACCOUNT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Type
              <select
                name="type"
                defaultValue={typeFilter}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">All</option>
                <option value="CREDIT">Credits only</option>
                <option value="DEBIT">Debits only</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              From
              <input
                type="date"
                name="from"
                defaultValue={params.from ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              To
              <input
                type="date"
                name="to"
                defaultValue={params.to ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Description
              <input
                type="search"
                name="search"
                defaultValue={params.search ?? ""}
                placeholder="Search text..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4 xl:col-span-6">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Apply filters
              </button>
              <a
                href="/accounts"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </a>
            </div>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Transaction history
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredRows.length} transaction{filteredRows.length === 1 ? "" : "s"}. {uncategorised} uncategorised.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Credits</p>
                <p className="font-semibold text-emerald-700">{money(filteredCredit)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Debits</p>
                <p className="font-semibold text-red-700">{money(filteredDebit)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Net</p>
                <p className="font-semibold text-slate-900">{money(filteredCredit - filteredDebit)}</p>
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No transactions match the selected filters.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Amend category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.category === "Uncategorised" ? "bg-amber-50" : ""}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {row.transactionDate.toLocaleDateString("en-GB")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {row.accountName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700">
                        {row.category}
                      </td>
                      <td className="min-w-72 px-4 py-3 text-sm text-slate-900">
                        {row.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-emerald-700">
                        {Number(row.credit) ? money(Number(row.credit)) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-red-700">
                        {Number(row.debit) ? money(Number(row.debit)) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {money(row.runningBalance)}
                      </td>
                      <td className="px-4 py-3">
                        <form action={updateTransactionCategory} className="flex gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <select
                            name="category"
                            defaultValue={row.category}
                            className="min-w-48 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                          >
                            {ACCOUNT_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
