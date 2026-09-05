import { redirect } from "next/navigation";

import { auth } from "@/auth";

import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-xl">
        <a
          href="/"
          className="mb-5 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </a>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Account
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Change password
          </h1>

          <p className="mt-2 mb-8 text-sm text-slate-600">
            Enter your current password and choose a new password for your account.
          </p>

          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
