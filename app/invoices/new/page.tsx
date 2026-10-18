import Link from "next/link";
import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import { todayUK } from "@/lib/invoices";
import InvoiceForm from "../InvoiceForm";
export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  if (!await invoiceUser()) redirect("/");
  const params = await searchParams;
  const accountCode = params.account === "CLUB" ? "CLUB" : "MENS";
  const [last, previous] = await Promise.all([
    prisma.invoice.findFirst({ where: { accountCode }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { customerName: true, customerAddress: true, customerEmail: true } }),
  ]);
  const customers = [...new Map(previous.map(c => [JSON.stringify(c), c])).values()];
  const date = todayUK(), due = new Date(date + "T00:00:00Z"); due.setUTCDate(due.getUTCDate() + 30);
  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-4xl"><Link href="/invoices" className="text-sm text-slate-600">← Invoices</Link><h1 className="my-5 text-3xl font-bold">New invoice</h1>
    <nav className="mb-4 flex gap-4 text-sm"><Link className="underline" href="/invoices/new?account=MENS">Men&apos;s account defaults</Link><Link className="underline" href="/invoices/new?account=CLUB">Club account defaults</Link></nav>
    <InvoiceForm customers={customers} initial={{ accountCode, invoiceDate: date, dueDate: due.toISOString().slice(0, 10), customerName: "", customerAddress: "", customerEmail: "", reference: "", issuerName: last?.issuerName ?? `The Essex Golf & Country Club${accountCode === "MENS" ? " - Men's Section" : ""}`, issuerAddress: last?.issuerAddress ?? "", issuerEmail: last?.issuerEmail ?? "", paymentInstructions: last?.paymentInstructions ?? "", notes: "", lines: [{ description: "", quantity: "1", unitPrice: "" }] }} />
  </div></main>;
}
