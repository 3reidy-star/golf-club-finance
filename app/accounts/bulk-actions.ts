"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountCategories } from "@/lib/account-categories";

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
  const categories = await getAccountCategories();
  const swapTransactionId = String(formData.get("swapTransactionId") ?? "");

  if (swapTransactionId) {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.accountTransaction.findUnique({ where: { id: swapTransactionId }, include: { invoicePayments: { where: { removedAt: null } } } });
      if (!transaction) throw new Error("Transaction not found.");
      if (transaction.invoicePayments.length) throw new Error("Remove this receipt's invoice allocations before swapping money in/out.");
      const credit = Number(transaction.credit), debit = Number(transaction.debit);
      if (credit > 0 && debit === 0) await tx.accountTransaction.update({ where: { id: swapTransactionId }, data: { credit: 0, debit: credit } });
      else if (debit > 0 && credit === 0) await tx.accountTransaction.update({ where: { id: swapTransactionId }, data: { credit: debit, debit: 0 } });
      else throw new Error("This transaction cannot be swapped automatically.");
    }, { isolationLevel: "Serializable" });
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
    if (id && !deleteIdSet.has(id) && categories.includes(category)) categoryUpdates.push({ id, category });
  }

  await prisma.$transaction(async (tx) => {
    if (deleteIds.length && await tx.invoicePayment.count({ where: { transactionId: { in: deleteIds } } })) {
      throw new Error("A selected transaction has invoice payment history and cannot be deleted. Keep it for the audit trail.");
    }
    await Promise.all([
      ...categoryUpdates.map((update) => tx.accountTransaction.update({ where: { id: update.id }, data: { category: update.category } })),
      ...visibleIds.filter((id) => !deleteIdSet.has(id)).map((id) => tx.accountTransaction.update({ where: { id }, data: { reconciled: reconciledIds.has(id) } })),
      ...(deleteIds.length ? [tx.accountTransaction.deleteMany({ where: { id: { in: deleteIds } } })] : []),
    ]);
  }, { isolationLevel: "Serializable" });

  revalidatePath("/accounts", "page");
  revalidatePath("/accounts/summary", "page");
  revalidatePath("/accounts/import", "page");
  redirect(returnTo);
}
