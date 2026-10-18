"use client";
import { useActionState, type ReactNode } from "react";
import { changeInvoice } from "./actions";
export default function ActionForm({ id, operation, label, children, confirmMessage }: { id: string; operation: string; label: string; children?: ReactNode; confirmMessage?: string }) {
  const [state, action, pending] = useActionState(changeInvoice, {});
  return <form action={action} className="grid gap-3" onSubmit={e => { if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault(); }}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="operation" value={operation} />{children}
    {state.error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    <button disabled={pending} className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : label}</button>
  </form>;
}
