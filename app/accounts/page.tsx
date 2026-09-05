import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateTransactionCategory } from "./actions";
import { ACCOUNT_CATEGORIES } from "./categories";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 75;

type SearchParams = Promise<{
  account?: string;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  type?: string;
  page?: string;
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

function pageHref(params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  query.set("page", String(page));
  return `/accounts?${query.toString()}`;
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

  const uncategorised = filteredRows.filter((row) => row.category === "Uncategorised").length;
  const filteredCredit = filteredRows.reduce((total, row) => total + Number(row.credit), 0);
  const filteredDebit = filteredRows.reduce((total, row) => total + Number(row.debit), 0);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const requestedPage = Number(params.page ?? "1");
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(Math.trunc(requestedPage), 1), totalPages)
    : 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(start, start + PAGE_SIZE);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="text-xs font-medium text-slate-600 hover:text-slate-900">← Dashboard</a>
          <a href="/accounts/import" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Import transactions</a>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Treasurer only</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="mt-1 text-sm text-slate-600">Full Club and Men&apos;s transactional history with spreadsheet-style filtering and categorisation.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <section key={account.code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">{account.name}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{money(accountBalanceByCode.get(account.code) ?? Number(account.openingBalance))}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>{account.transactions.length} transactions</span>
                <span>Opening {money(Number(account.openingBalance))}</span>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Transaction filters</h2>
          <form method="get" className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-medium text-slate-700">Account
              <select name="account" defaultValue={accountFilter} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
                <option value="ALL">All accounts</option>
                {accounts.map((account) => <option key={account.code} value={account.code}>{account.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">Category
              <select name="category" defaultValue={categoryFilter} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
                <option value="ALL">All categories</option>
                {ACCOUNT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">Type
              <select name="type" defaultValue={typeFilter} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
                <option value="ALL">All</option><option value="CREDIT">Credits only</option><option value="DEBIT">Debits only</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">From
              <input type="date" name="from" defaultValue={params.from ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
            </label>
            <label className="text-xs font-medium text-slate-700">To
              <input type="date" name="to" defaultValue={params.to ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
            </label>
            <label className="text-xs font-medium text-slate-700">Description
              <input type="search" name="search" defaultValue={params.search ?? ""} placeholder="Search..." className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
            </label>
            <div className="flex items-end gap-2 md:col-span-3 xl:col-span-6">
              <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Apply filters</button>
              <a href="/accounts" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Clear</a>
            </div>
          </form>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Transaction history</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {filteredRows.length === 0 ? "No transactions" : `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`}. {uncategorised} uncategorised.
              </p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="font-semibold text-emerald-700">Credits {money(filteredCredit)}</span>
              <span className="font-semibold text-red-700">Debits {money(filteredDebit)}</span>
              <span className="font-semibold text-slate-900">Net {money(filteredCredit - filteredDebit)}</span>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No transactions match the selected filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-slate-200 text-[11px] leading-tight">
                  <colgroup>
                    <col className="w-[7%]" /><col className="w-[9%]" /><col className="w-[12%]" /><col className="w-[25%]" />
                    <col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[9%]" /><col className="w-[22%]" />
                  </colgroup>
                  <thead className="bg-slate-50">
                    <tr>
                      {['Date','Account','Category','Description','Credit','Debit','Balance','Amend category'].map((heading) => (
                        <th key={heading} className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.map((row) => (
                      <tr key={row.id} className={row.category === "Uncategorised" ? "bg-amber-50" : ""}>
                        <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">{row.transactionDate.toLocaleDateString("en-GB")}</td>
                        <td className="truncate px-2 py-1.5 text-slate-700" title={row.accountName}>{row.accountName}</td>
                        <td className="truncate px-2 py-1.5 font-medium text-slate-700" title={row.category}>{row.category}</td>
                        <td className="truncate px-2 py-1.5 text-slate-900" title={row.description}>{row.description}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right text-emerald-700">{Number(row.credit) ? money(Number(row.credit)) : "-"}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right text-red-700">{Number(row.debit) ? money(Number(row.debit)) : "-"}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-slate-900">{money(row.runningBalance)}</td>
                        <td className="px-2 py-1">
                          <form action={updateTransactionCategory} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={row.id} />
                            <select name="category" defaultValue={row.category} className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1 py-1 text-[10px]">
                              {ACCOUNT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                            <button type="submit" className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">Save</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-3 text-xs">
                  <span className="text-slate-500">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    {currentPage > 1 && (
                      <a href={pageHref(params, currentPage - 1)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700">Previous</a>
                    )}
                    {currentPage < totalPages && (
                      <a href={pageHref(params, currentPage + 1)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700">Next</a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
