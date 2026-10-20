"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountCategories } from "@/lib/account-categories";

export type ManualState = { error?: string; success?: string };
export async function addManualTransaction(_state: ManualState, data: FormData): Promise<ManualState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TREASURER") return { error: "Treasurer access only." };
  const categories = await getAccountCategories();
  const accountCode = String(data.get("accountCode") ?? "");
  const direction = String(data.get("direction") ?? "");
  const date = String(data.get("date") ?? "");
  const description = String(data.get("description") ?? "").trim();
  const category = String(data.get("category") ?? "");
  const amountText = String(data.get("amount") ?? "");
  const amount = Number(amountText);
  if (accountCode !== "CLUB" && accountCode !== "MENS") return { error: "Choose an account." };
  if (direction !== "IN" && direction !== "OUT") return { error: "Choose money in or out." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + "T00:00:00Z").toISOString().slice(0,10) !== date) return { error: "Enter a valid date." };
  if (!description || description.length > 500) return { error: "Enter a description (maximum 500 characters)." };
  if (!categories.includes(category)) return { error: "Choose a category." };
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999) return { error: "Enter a positive amount with up to two decimal places." };
  const credit = direction === "IN" ? amount : 0;
  const debit = direction === "OUT" ? amount : 0;
  const base = `${accountCode}|${date}|${description}|${credit.toFixed(2)}|${debit.toFixed(2)}`;
  const sourceKey = createHash("sha256").update(base + "|1").digest("hex");
  const duplicate = await prisma.accountTransaction.findUnique({ where: { sourceKey } });
  if (duplicate) return { error: "This transaction already exists. Check the transaction history before adding it again." };
  try {
    await prisma.accountTransaction.create({ data: { accountCode, transactionDate: new Date(date + "T00:00:00Z"), description, category, credit, debit, sourceKey } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { error: "This transaction already exists." };
    return { error: "Unable to save the transaction. Please try again." };
  }
  revalidatePath("/accounts");
  revalidatePath("/accounts/summary");
  return { success: "Manual transaction saved. Account balances have been updated." };
}
