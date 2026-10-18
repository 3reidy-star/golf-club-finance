"use client";
import { useActionState, useState } from "react";
import { saveInvoice } from "./actions";
import { calculateLines, money, type LineInput } from "@/lib/invoices";
export type InvoiceDraft = {
  id?: string; version?: string; accountCode: string; customerName: string; customerAddress: string; customerEmail: string; reference: string;
  issuerName: string; issuerAddress: string; issuerEmail: string; paymentInstructions: string; invoiceDate: string; dueDate: string; notes: string; lines: LineInput[];
};
type Customer = { customerName: string; customerAddress: string; customerEmail: string };
export default function InvoiceForm({ initial, customers }: { initial: InvoiceDraft; customers: Customer[] }) {
  const [state, action, pending] = useActionState(saveInvoice, {});
  const [lines, setLines] = useState(initial.lines);
  const [customer, setCustomer] = useState({ customerName: initial.customerName, customerAddress: initial.customerAddress, customerEmail: initial.customerEmail });
  const input = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  const area = "grid gap-4 rounded-xl border border-slate-200 bg-white p-5";
  let total = "Complete the lines to see the total";
  try { total = money(calculateLines(lines).totalPence); } catch { /* Show validation when saved. */ }
  function change(index: number, key: keyof LineInput, value: string) { setLines(lines.map((line, i) => i === index ? { ...line, [key]: value } : line)); }
  return <form action={action} className="grid gap-5">
    <input type="hidden" name="id" value={initial.id ?? ""} /><input type="hidden" name="version" value={initial.version ?? ""} /><input type="hidden" name="lines" value={JSON.stringify(lines)} />
    <section className={area}><h2 className="text-lg font-semibold">Invoice details</h2><div className="grid gap-4 sm:grid-cols-3">
      <label>Account<input type="hidden" name="accountCode" value={initial.accountCode} /><span className={`${input} bg-slate-50`}>{initial.accountCode === "MENS" ? "Men's Account" : "Club Account"}</span></label>
      <label>Invoice date<input required name="invoiceDate" type="date" defaultValue={initial.invoiceDate} className={input} /></label>
      <label>Payment due<input required name="dueDate" type="date" defaultValue={initial.dueDate} className={input} /></label>
    </div><label>Customer / purchase order reference<input name="reference" maxLength={150} defaultValue={initial.reference} className={input} /></label></section>
    <section className={area}><h2 className="text-lg font-semibold">Bill to</h2>
      {customers.length > 0 && <label>Use a previous customer<select className={input} defaultValue="" onChange={e => { const found = customers[Number(e.target.value)]; if (e.target.value !== "" && found) setCustomer(found); }}><option value="">Choose a customer (optional)</option>{customers.map((c, i) => <option key={i} value={i}>{c.customerName} — {c.customerEmail || c.customerAddress.split("\n")[0]}</option>)}</select></label>}
      <label>Customer name<input required name="customerName" maxLength={150} value={customer.customerName} onChange={e => setCustomer({ ...customer, customerName: e.target.value })} className={input} /></label>
      <label>Billing address<textarea required name="customerAddress" maxLength={1000} rows={3} value={customer.customerAddress} onChange={e => setCustomer({ ...customer, customerAddress: e.target.value })} className={input} /></label>
      <label>Email (optional)<input name="customerEmail" type="email" maxLength={254} value={customer.customerEmail} onChange={e => setCustomer({ ...customer, customerEmail: e.target.value })} className={input} /></label>
    </section>
    <section className={area}><h2 className="text-lg font-semibold">Items</h2>
      {lines.map((line, i) => <fieldset key={i} className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-12"><legend className="text-sm font-medium">Line {i + 1}</legend>
        <label className="sm:col-span-6">Description<textarea required maxLength={500} value={line.description} onChange={e => change(i, "description", e.target.value)} className={input} rows={2} /></label>
        <label className="sm:col-span-2">Quantity<input required type="number" min="0.01" max="99999.99" step="0.01" value={line.quantity} onChange={e => change(i, "quantity", e.target.value)} className={input} /></label>
        <label className="sm:col-span-3">Unit price (£)<input required type="number" min="0" max="9999999.99" step="0.01" value={line.unitPrice} onChange={e => change(i, "unitPrice", e.target.value)} className={input} /></label>
        <button type="button" disabled={lines.length === 1} aria-label={`Remove line ${i + 1}`} className="self-end rounded border px-2 py-2 text-sm disabled:opacity-40 sm:col-span-1" onClick={() => setLines(lines.filter((_, index) => index !== i))}>×</button>
      </fieldset>)}
      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={lines.length >= 50} className="rounded border px-3 py-2 text-sm" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])}>+ Add line</button><strong>Total: {total}</strong></div>
    </section>
    <section className={area}><h2 className="text-lg font-semibold">Issued by and payment details</h2><p className="text-sm text-slate-600">Copied onto this invoice. For new invoices, details are suggested from the last invoice for the selected account.</p>
      <label>Issuer name<input required name="issuerName" maxLength={150} defaultValue={initial.issuerName} className={input} /></label>
      <label>Issuer address<textarea required name="issuerAddress" maxLength={1000} rows={3} defaultValue={initial.issuerAddress} className={input} /></label>
      <label>Contact email (optional)<input name="issuerEmail" type="email" maxLength={254} defaultValue={initial.issuerEmail} className={input} /></label>
      <label>Payment instructions<textarea name="paymentInstructions" maxLength={1500} rows={4} defaultValue={initial.paymentInstructions} placeholder="Bank account name, sort code and account number, or other payment instructions. Required before issuing." className={input} /></label>
      <label>Notes shown on invoice<textarea name="notes" maxLength={2000} rows={3} defaultValue={initial.notes} className={input} /></label>
    </section>
    <p className="text-sm text-slate-600">Amounts are in GBP. No VAT is added. Save a draft to review it before issuing.</p>
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{state.error}</p>}
    <button disabled={pending} className="rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save draft"}</button>
  </form>;
}
