"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CATEGORIES } from "./categories";

async function requireTreasurer() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TREASURER") throw new Error("Treasurer access only.");
}

function safeReturnTo(formData: FormData) {
  const raw = String(formData.get("returnTo") ?? "/accounts");
  return raw.startsWith("/accounts") && !raw.startsWith("//") ? raw : "/accounts";
}

export async function saveTransactionCategories(formData: FormData) {
  await requireTreasurer();
  const returnTo = safeReturnTo(formData);
  const swapTransactionId = String(formData.get("swapTransactionId") ?? "");

  if (swapTransactionId) {
    const transaction = await prisma.accountTransaction.findUnique({ where: { id: swapTransactionId }, select: { credit: true, debit: true } });
    if (!transaction) throw new Error("Transaction not found.");
    const credit = Number(transaction.credit);
    const debit = Number(transaction.debit);
    if (credit > 0 && debit === 0) await prisma.accountTransaction.update({ where: { id: swapTransactionId }, data: { credit: 0, debit: credit } });
    else if (debit > 0 && credit === 0) await prisma.accountTransaction.update({ where: { id: swapTransactionId }, data: { credit: debit, debit: 0 } });
    else throw new Error("This transaction cannot be swapped automatically.");
    revalidatePath("/accounts", "page");
    revalidatePath("/accounts/summary", "page");
    redirect(returnTo);
  }

  const deleteIds = formData.getAll("deleteTransaction").map(String).filter(Boolean);
  const deleteIdSet = new Set(deleteIds);
  const visibleIds = formData.getAll("visibleTransactionId").map(String).filter(Boolean);
  const reconciledIds = new Set(formData.getAll("reconciledTransaction").map(String).filter(Boolean));
  const categoryUpdates: Array<{ id: string; category: string }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("category:")) continue;
    const id = key.slice("category:".length);
    const category = String(value);
    if (id && !deleteIdSet.has(id) && ACCOUNT_CATEGORIES.includes(category as (typeof ACCOUNT_CATEGORIES)[number])) categoryUpdates.push({ id, category });
  }

  await prisma.$transaction([
    ...categoryUpdates.map((update) => prisma.accountTransaction.update({ where: { id: update.id }, data: { category: update.category } })),
    ...visibleIds.filter((id) => !deleteIdSet.has(id)).map((id) => prisma.accountTransaction.update({ where: { id }, data: { reconciled: reconciledIds.has(id) } })),
    ...(deleteIds.length ? [prisma.accountTransaction.deleteMany({ where: { id: { in: deleteIds } } })] : []),
  ]);

  revalidatePath("/accounts", "page");
  revalidatePath("/accounts/summary", "page");
  revalidatePath("/accounts/import", "page");
  redirect(returnTo);
}
