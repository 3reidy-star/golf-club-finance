import Link from "next/link";
import { invoiceUser } from "@/lib/invoice-auth";

export default async function CompetitionsPage() {
  const treasurer = await invoiceUser();
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Dashboard
        </Link>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Competitions
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Competition Management
          </h1>

          <p className="mt-2 text-slate-600">
            Calculate competition prizes
            and automatically create the
            required payout requests.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {treasurer && (
            <Link href="/competitions/mens-payouts" className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Men&apos;s Section · Treasurer</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Competition Payouts</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Share player top-ups per competition on WhatsApp and remove duplicate payouts.</p>
            </Link>
          )}
          <Link
            href="/competitions/new"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Men&apos;s Section
            </p>

            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              New Competition
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Calculate prizes, Birdie
              2&apos;s and the Men&apos;s
              section payment.
            </p>
          </Link>

          <Link
            href="/winter-league"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Men&apos;s Section
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Winter League
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Import rounds 1–6 and maintain the best-5 overall Winter League standings.
            </p>
          </Link>

          <div className="rounded-xl border border-slate-200 bg-white p-6 opacity-60 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Juniors
            </p>

            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Junior Competitions
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Junior competition rules
              will be configured next.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}