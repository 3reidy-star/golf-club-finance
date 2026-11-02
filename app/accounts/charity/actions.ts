"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import { parseDate, parsePence } from "@/lib/invoices";
import { toPence, validateTimeline } from "@/lib/charity-ledger";

export type State = { error?: string; success?: string };
function refresh() {
  for (const path of ["/accounts", "/accounts/summary", "/accounts/charity", "/invoices"]) revalidatePath(path);
}
function fail(error: unknown): State {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { error: "This transaction is already allocated. Refresh the page." };
    if (error.code === "P2034") return { error: "The accounts changed while saving. Refresh and try again." };
    return { error: "Unable to save the allocation. Refresh and try again." };
  }
  return { error: error instanceof Error ? error.message : "Unable to save the allocation." };
}
export async function allocateCharity(_state: State, formData: FormData): Promise<State> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  try {
    const id = String(formData.get("transactionId") ?? "");
    const type = String(formData.get("type") ?? "");
    const amountPence = parsePence(String(formData.get("amount") ?? ""));
    if (!id || !["RECEIPT", "COST", "PAYMENT"].includes(type)) throw new Error("Choose a transaction and allocation type.");
    await prisma.$transaction(async tx => {
      const bank = await tx.accountTransaction.findUnique({ where: { id }, include: { invoicePayments: { where: { removedAt: null } }, charityEntries: { where: { removedAt: null } } } });
      if (!bank || bank.accountCode !== "MENS") throw new Error("Choose a Men’s account transaction.");
      if (bank.charityEntries.length) throw new Error("This transaction is already allocated to the charity.");
      const credit = toPence(bank.credit), debit = toPence(bank.debit);
      if ((type === "RECEIPT" && (credit <= 0 || debit !== 0)) || ((type === "PAYMENT" || type === "COST") && (debit <= 0 || credit !== 0))) throw new Error("Choose a matching money-in or money-out transaction.");
      const maximum = (type === "RECEIPT" ? credit : debit) - bank.invoicePayments.reduce((n, item) => n + item.amountPence, 0);
      if (amountPence > maximum) throw new Error("Amount exceeds the unallocated bank transaction.");
      const all = await tx.charityEntry.findMany({ where: { accountCode: "MENS", removedAt: null } });
      const entry = { accountCode: "MENS" as const, type: type as "RECEIPT" | "COST" | "PAYMENT", effectiveDate: bank.transactionDate, amountPence, description: bank.description, transactionId: bank.id, recordedById: user.id };
      validateTimeline([...all, { ...entry, removedAt: null }]);
      await tx.charityEntry.create({ data: entry });
    }, { isolationLevel: "Serializable" });
  } catch (error) { return fail(error); }
  refresh(); return { success: "Charity allocation saved." };
}
export async function allocateCategorisedReceipts(_state: State, formData: FormData): Promise<State> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  let count = 0;
  try {
    const ids = formData.getAll("transactionId").map(String);
    const expectedPence = Number(formData.get("expectedPence"));
    if (!ids.length || ids.length !== new Set(ids).size || !Number.isSafeInteger(expectedPence) || expectedPence <= 0) throw new Error("Refresh the page and review the receipts first.");
    await prisma.$transaction(async tx => {
      const bank = await tx.accountTransaction.findMany({ where: { id: { in: ids }, accountCode: "MENS", category: { equals: "Thommo Charity", mode: "insensitive" }, credit: { gt: 0 }, debit: 0 }, include: { charityEntries: { where: { removedAt: null } }, invoicePayments: { where: { removedAt: null } } } });
      const eligible = bank.filter(t => !t.charityEntries.length && !t.invoicePayments.length);
      if (eligible.length !== ids.length || eligible.reduce((sum, t) => sum + toPence(t.credit), 0) !== expectedPence) throw new Error("The receipts have changed. Refresh and review them again.");
      const entries = eligible.map(t => ({ accountCode: "MENS" as const, type: "RECEIPT" as const, effectiveDate: t.transactionDate, amountPence: toPence(t.credit), description: t.description, transactionId: t.id, recordedById: user.id }));
      await tx.charityEntry.createMany({ data: entries });
      count = entries.length;
    }, { isolationLevel: "Serializable" });
  } catch (error) { return fail(error); }
  refresh(); return { success: `${count} charity receipt${count === 1 ? "" : "s"} allocated.` };
}
export async function addCharityContribution(_state: State, formData: FormData): Promise<State> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  try {
    const description = String(formData.get("description") ?? "").trim();
    const amountPence = parsePence(String(formData.get("amount") ?? ""));
    const effectiveDate = parseDate(String(formData.get("date") ?? ""));
    if (!description || description.length > 250) throw new Error("Enter a description (maximum 250 characters).");
    await prisma.$transaction(async tx => {
      const existing = await tx.charityEntry.findFirst({ where: { accountCode: "MENS", type: "CONTRIBUTION", description, amountPence, effectiveDate, removedAt: null } });
      if (existing) throw new Error("This contribution is already recorded.");
      await tx.charityEntry.create({ data: { accountCode: "MENS", type: "CONTRIBUTION", effectiveDate, amountPence, description, recordedById: user.id } });
    }, { isolationLevel: "Serializable" });
  } catch (error) { return fail(error); }
  refresh(); return { success: "Section contribution recorded." };
}
export async function removeCharityAllocation(_state: State, formData: FormData): Promise<State> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  try {
    const id = String(formData.get("id") ?? ""), reason = String(formData.get("reason") ?? "").trim();
    if (!id || !reason || reason.length > 500) throw new Error("Enter a reason (maximum 500 characters).");
    await prisma.$transaction(async tx => {
      const entry = await tx.charityEntry.findUnique({ where: { id } });
      if (!entry || entry.removedAt) throw new Error("Active charity entry not found.");
      const all = await tx.charityEntry.findMany({ where: { accountCode: "MENS", removedAt: null, id: { not: id } } });
      validateTimeline(all);
      await tx.charityEntry.update({ where: { id }, data: { removedAt: new Date(), removedById: user.id, removalReason: reason } });
    }, { isolationLevel: "Serializable" });
  } catch (error) { return fail(error); }
  refresh(); return { success: "Allocation removed; its audit history is retained." };
}
