import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ImportForm from "./ImportForm";
import PasteImportForm from "./PasteImportForm";

export const dynamic = "force-dynamic";

export default async function AccountImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TREASURER") redirect("/");

  const batches = await prisma.accountImportBatch.findMany({
    include: { account: true },
    orderBy: { importedAt: "desc" },
    take: 10,
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex gap-3">
          <a
            href="/accounts"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            ← Accounts
          </a>
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Treasurer
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Import transactions
          </h1>
          <p className="mt-2 text-slate-600">
            Either copy and paste transactions directly from online banking or upload a CSV file.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Quickest
              </span>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Copy & paste from bank
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Highlight the transaction table in online banking, copy it and paste it straight into the box below. New rows will be imported and matching transactions already in the accounts will be skipped.
              </p>
            </div>
            <PasteImportForm />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Upload CSV
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use this for the historical account files or when you download a transaction CSV from the bank.
              </p>
            </div>
            <ImportForm />
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent imports</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {batches.length === 0 ? (
              <p className="text-sm text-slate-500">No transaction files imported yet.</p>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {batch.account.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{batch.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {batch.rowCount} rows · {batch.importedAt.toLocaleDateString("en-GB")}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
