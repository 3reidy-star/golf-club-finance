import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ImportForm from "./ImportForm";

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
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex gap-3">
          <a href="/accounts" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">← Accounts</a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Treasurer</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Import transactions</h1>
            <p className="mb-8 mt-2 text-sm text-slate-600">Upload the latest bank transactions. Existing matching rows are skipped automatically.</p>
            <ImportForm />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recent imports</h2>
            <div className="mt-4 space-y-3">
              {batches.length === 0 ? (
                <p className="text-sm text-slate-500">No transaction files imported yet.</p>
              ) : batches.map((batch) => (
                <div key={batch.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-sm font-semibold text-slate-900">{batch.account.name}</p>
                  <p className="text-xs text-slate-500">{batch.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">{batch.rowCount} rows · {batch.importedAt.toLocaleDateString("en-GB")}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
