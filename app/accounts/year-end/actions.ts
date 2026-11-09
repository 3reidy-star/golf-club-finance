"use server";
import { revalidatePath } from "next/cache";
import { invoiceUser } from "@/lib/invoice-auth";
import { parsePence } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
export type ReviewState = { error?: string; success?: string; version?: number };
export async function saveYearEndReview(_state: ReviewState, data: FormData): Promise<ReviewState> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  try {
    const accountCode = String(data.get("accountCode")), year = Number(data.get("year")), version = Number(data.get("version"));
    if ((accountCode !== "CLUB" && accountCode !== "MENS") || !Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isSafeInteger(version) || version < 0) return { error: "Choose a valid account and year." };
    const optionalPence = (key: string) => { const value = String(data.get(key) ?? "").trim(); return value ? parsePence(value, true) : null; };
    const debtorsPence = optionalPence("debtors"), otherCreditorsPence = optionalPence("creditors");
    const stockConfirmed = data.get("stockConfirmed") === "on";
    const stockItems = [];
    for (let i = 0; i < 20; i++) {
      const description = String(data.get(`description:${i}`) ?? "").trim();
      const quantityText = String(data.get(`quantity:${i}`) ?? "").trim(), cost = String(data.get(`cost:${i}`) ?? "").trim();
      if (!description && !quantityText && !cost) continue;
      if (!description || description.length > 150 || !/^\d{1,5}$/.test(quantityText) || Number(quantityText) < 1 || !cost) return { error: "Each stock line needs a description, whole quantity and unit value." };
      const unitCostPence = parsePence(cost, true), quantity = Number(quantityText);
      stockItems.push({ description, quantity, unitCostPence });
    }
    if (stockItems.reduce((sum, item) => sum + item.quantity * item.unitCostPence, 0) > 999999999) return { error: "Stock total is too large." };
    const commentary = String(data.get("commentary") ?? "").trim();
    if (commentary.length > 3000) return { error: "Keep commentary within 3,000 characters." };
    const update = { debtorsPence, otherCreditorsPence, stockItems, stockConfirmed, commentary, updatedById: user.id };
    const savedVersion = await prisma.$transaction(async tx => {
      const existing = await tx.annualAccountsReview.findUnique({ where: { accountCode_year: { accountCode, year } } });
      if ((existing?.version ?? 0) !== version) throw new Error("This review changed in another window. Refresh before saving.");
      if (existing) {
        const updated = await tx.annualAccountsReview.updateMany({ where: { id: existing.id, version }, data: { ...update, version: { increment: 1 } } });
        if (updated.count !== 1) throw new Error("This review changed in another window. Refresh before saving.");
      } else await tx.annualAccountsReview.create({ data: { ...update, accountCode, year } });
      return version + 1;
    }, { isolationLevel: "Serializable" });
    for (const path of ["/accounts/summary", "/accounts/year-end", "/accounts/agm"]) revalidatePath(path);
    return { success: "Year-end review saved. Prepare a fresh AGM copy to include these changes.", version: savedVersion };
  } catch { return { error: "Unable to save. Check the amounts, or refresh if another window changed this review." }; }
}
