import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Golf Club Finance
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to manage section payments, player top-ups and
            competitions.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}