"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { invoiceUser } from "@/lib/invoice-auth";
import { calculateLines, parseDate, parsePence, validateAllocation } from "@/lib/invoices";
export type InvoiceState = { error?: string };
async function serial<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable" }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 3) continue; throw error; }
  }
}
function text(data: FormData, key: string, max: number, required = false) {
  const value = String(data.get(key) ?? "").trim();
  if ((required && !value) || value.length > max) throw new Error(`Check ${key.replace(/([A-Z])/g, " $1").toLowerCase()} (maximum ${max} characters).`);
  return value;
}
function errorState(error: unknown): InvoiceState {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return { error: "Unable to save. Refresh and try again." };
  return { error: error instanceof Error ? error.message : "Unable to save. Please try again." };
}
function refresh(id: string) { revalidatePath("/invoices"); revalidatePath(`/invoices/${id}`); }
export async function saveInvoice(_state: InvoiceState, data: FormData): Promise<InvoiceState> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  let id = "";
  try {
    const accountCode = text(data, "accountCode", 4);
    if (accountCode !== "MENS" && accountCode !== "CLUB") throw new Error("Choose an account.");
    const invoiceDate = parseDate(text(data, "invoiceDate", 10)), dueDate = parseDate(text(data, "dueDate", 10));
    if (dueDate < invoiceDate) throw new Error("Due date cannot be before the invoice date.");
    const { lines, totalPence } = calculateLines(JSON.parse(String(data.get("lines") ?? "[]")));
    const fields = {
      accountCode, invoiceDate, dueDate, totalPence,
      customerName: text(data, "customerName", 150, true), customerAddress: text(data, "customerAddress", 1000, true), customerEmail: text(data, "customerEmail", 254), reference: text(data, "reference", 150),
      issuerName: text(data, "issuerName", 150, true), issuerAddress: text(data, "issuerAddress", 1000, true), issuerEmail: text(data, "issuerEmail", 254), paymentInstructions: text(data, "paymentInstructions", 1500), notes: text(data, "notes", 2000),
    } as const;
    for (const email of [fields.customerEmail, fields.issuerEmail]) if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    id = await serial(async tx => {
      const existingId = text(data, "id", 100);
      if (existingId) {
        const existing = await tx.invoice.findUnique({ where: { id: existingId } });
        if (!existing || existing.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");
        if (existing.updatedAt.toISOString() !== data.get("version")) throw new Error("This draft changed in another window. Refresh before editing.");
        await tx.invoice.update({ where: { id: existingId }, data: { ...fields, lines: { deleteMany: {}, create: lines } } });
        return existingId;
      }
      return (await tx.invoice.create({ data: { ...fields, createdById: user.id, lines: { create: lines } } })).id;
    });
  } catch (error) { return errorState(error); }
  refresh(id); redirect(`/invoices/${id}`);
}
export async function changeInvoice(_state: InvoiceState, data: FormData): Promise<InvoiceState> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  const id = text(data, "id", 100);
  try {
    await serial(async tx => {
      const invoice = await tx.invoice.findUnique({ where: { id }, include: { payments: true, lines: true } });
      if (!invoice) throw new Error("Invoice not found.");
      const operation = text(data, "operation", 20);
      if (operation === "issue") {
        if (invoice.status === "ISSUED") return;
        if (invoice.status !== "DRAFT") throw new Error("Only drafts can be issued.");
        if (!invoice.lines.length || invoice.totalPence < 1) throw new Error("Add invoice lines before issuing.");
        if (!invoice.paymentInstructions.trim()) throw new Error("Edit this draft and add payment instructions before issuing.");
        const key = `${invoice.accountCode}-${invoice.invoiceDate.getUTCFullYear()}`;
        const sequence = await tx.invoiceSequence.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } });
        const number = `INV-${key}-${String(sequence.value).padStart(4, "0")}`;
        await tx.invoice.update({ where: { id }, data: { number, status: "ISSUED", issuedAt: new Date() } });
      } else if (operation === "void") {
        if (invoice.status !== "ISSUED") throw new Error("Only issued invoices can be voided.");
        if (invoice.payments.some(p => !p.removedAt)) throw new Error("Remove payment allocations before voiding this invoice.");
        const voidReason = text(data, "reason", 500, true);
        await tx.invoice.update({ where: { id }, data: { status: "VOID", voidReason, voidedAt: new Date() } });
      } else if (operation === "allocate") {
        const transactionId = text(data, "transactionId", 100, true), amountPence = parsePence(text(data, "amount", 20));
        const requestId = text(data, "requestId", 36, true);
        if (!/^[a-f0-9-]{36}$/.test(requestId)) throw new Error("Refresh this invoice before allocating a payment.");
        const already = await tx.invoicePayment.findUnique({ where: { id: requestId } });
        if (already) {
          if (already.invoiceId === id && already.transactionId === transactionId && already.amountPence === amountPence) return;
          throw new Error("Payment request already used. Refresh and try again.");
        }
        const bank = await tx.accountTransaction.findUnique({ where: { id: transactionId }, include: { invoicePayments: { where: { removedAt: null } } } });
        if (!bank) throw new Error("Bank receipt not found.");
        const paidPence = invoice.payments.filter(p => !p.removedAt).reduce((n, p) => n + p.amountPence, 0);
        validateAllocation({ ...invoice, paidPence }, { accountCode: bank.accountCode, creditPence: Math.round(Number(bank.credit) * 100), debitPence: Math.round(Number(bank.debit) * 100), allocatedPence: bank.invoicePayments.reduce((n, p) => n + p.amountPence, 0) }, amountPence);
        await tx.invoicePayment.create({ data: { id: requestId, invoiceId: id, transactionId, amountPence, recordedById: user.id } });
      } else if (operation === "remove-payment") {
        const paymentId = text(data, "paymentId", 100, true), reason = text(data, "reason", 500, true);
        const payment = invoice.payments.find(p => p.id === paymentId && !p.removedAt);
        if (!payment) throw new Error("Active payment allocation not found.");
        await tx.invoicePayment.update({ where: { id: paymentId }, data: { removedAt: new Date(), removedById: user.id, removalReason: reason } });
      } else throw new Error("Unknown action.");
    });
  } catch (error) { return errorState(error); }
  refresh(id); revalidatePath("/accounts"); return {};
}
