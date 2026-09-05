export default function CompetitionsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="mb-5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Dashboard
        </a>

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
          <a
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
          </a>

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