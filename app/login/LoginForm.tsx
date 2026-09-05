"use client";

import { useActionState } from "react";

import { login } from "./actions";

export default function LoginForm() {
  const [errorMessage, formAction, isPending] =
    useActionState(login, undefined);

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Username
        </label>

        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500"
        />
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Signing in..."
          : "Sign in"}
      </button>
    </form>
  );
}