import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CATEGORIES, updateTransactionCategory } from "./actions";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TREASURER") redirect("/");

  const accounts = await prisma.financeAccount.findMany({
    include: {
      transactions: { orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }] },
    },
    orderBy: { name: "asc" },
  });

  const recent = accounts.flatMap((account) => account.transactions.map((transaction) => ({ ...transaction, accountName: account.name })))
    .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
    .slice(0, 150);

  const uncategorised = recent.filter((row) => row.category === "Uncategorised").length;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Dashboard</a>
          <a href="/accounts/import" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Import transactions</a>
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Treasurer only</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Accounts</h1>
          <p className="mt-2 text-slate-600">Club and Men&apos;s accounts based on the existing accounts workbook, with transaction imports and categorisation.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {accounts.map((account) => {
            const movement = account.transactions.reduce((total, row) => total + Number(row.credit) - Number(row.debit), 0);
            const balance = Number(account.openingBalance) + movement;
            return (
              <section key={account.code} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">{account.name}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{money(balance)}</p>
                <div className="mt-4 flex gap-6 text-sm text-slate-500">
                  <span>{account.transactions.length} transactions</span>
                  <span>Opening {money(Number(account.openingBalance))}</span>
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Latest transactions</h2>
              <p className="mt-1 text-sm text-slate-500">Categorise imported transactions here. {uncategorised} of the latest {recent.length} need reviewing.</p>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No transactions loaded yet. Use Import transactions to add the workbook history or the latest bank export.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Debit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((row) => (
                    <tr key={row.id} className={row.category === "Uncategorised" ? "bg-amber-50" : ""}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.transactionDate.toLocaleDateString("en-GB")}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.accountName}</td>
                      <td className="min-w-64 px-4 py-3 text-sm text-slate-900">{row.description}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{Number(row.credit) ? money(Number(row.credit)) : "-"}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{Number(row.debit) ? money(Number(row.debit)) : "-"}</td>
                      <td className="px-4 py-3">
                        <form action={updateTransactionCategory} className="flex gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <select name="category" defaultValue={row.category} className="min-w-48 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                            {ACCOUNT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                          <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Save</button>
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
