import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import InvoiceForm from "../../InvoiceForm";
export default async function EditInvoice({ params }: { params: Promise<{ id: string }> }) {
  if (!await invoiceUser()) redirect("/");
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } } } });
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${id}`);
  const initial = { ...invoice, version: invoice.updatedAt.toISOString(), invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10), dueDate: invoice.dueDate.toISOString().slice(0, 10), lines: invoice.lines.map(l => ({ description: l.description, quantity: l.quantity.toString(), unitPrice: (l.unitPricePence / 100).toFixed(2) })) };
  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-4xl"><Link href={`/invoices/${id}`} className="text-sm text-slate-600">← Invoice</Link><h1 className="my-5 text-3xl font-bold">Edit draft</h1><InvoiceForm initial={initial} customers={[]} /></div></main>;
}
