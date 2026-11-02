"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { invoiceUser } from "@/lib/invoice-auth";
import { parsePence } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";

export type CashState = { error?: string; success?: string; version?: number };
export async function saveCashCount(_previous: CashState, formData: FormData): Promise<CashState> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  try {
    const accountCode = String(formData.get("accountCode") ?? "");
    const yearText = String(formData.get("year") ?? "");
    const versionText = String(formData.get("version") ?? "");
    const note = String(formData.get("note") ?? "").trim();
    if (accountCode !== "MENS" && accountCode !== "CLUB") throw new Error("Choose an account.");
    if (!/^\d{4}$/.test(yearText) || Number(yearText) < 2000 || Number(yearText) > 2100) throw new Error("Choose a valid year.");
    if (!/^\d+$/.test(versionText) || !Number.isSafeInteger(Number(versionText))) throw new Error("Refresh the page and try again.");
    if (note.length > 500) throw new Error("Notes must be 500 characters or fewer.");
    const year = Number(yearText), version = Number(versionText), amountPence = parsePence(String(formData.get("amount") ?? ""), true);
    const newVersion = await prisma.$transaction(async tx => {
      const account = await tx.financeAccount.findUnique({ where: { code: accountCode }, select: { code: true } });
      if (!account) throw new Error("Account not found.");
      const key = { accountCode, year } as const;
      const existing = await tx.cashYearEnd.findUnique({ where: { accountCode_year: key } });
      if ((existing?.version ?? 0) !== version) throw new Error("This cash balance changed in another window. Refresh and review it before saving.");
      let id: string;
      if (existing) {
        const updated = await tx.cashYearEnd.updateMany({ where: { id: existing.id, version }, data: { amountPence, note, version: { increment: 1 }, recordedById: user.id, recordedAt: new Date() } });
        if (updated.count !== 1) throw new Error("This cash balance changed in another window. Refresh and review it before saving.");
        id = existing.id;
      } else {
        const created = await tx.cashYearEnd.create({ data: { accountCode, year, amountPence, note, recordedById: user.id } });
        id = created.id;
      }
      await tx.cashYearEndHistory.create({ data: { cashCountId: id, amountPence, note, recordedById: user.id, version: version + 1 } });
      return version + 1;
    }, { isolationLevel: "Serializable" });
    for (const path of ["/accounts", "/accounts/cash", "/accounts/summary", "/accounts/annual-pdf"]) revalidatePath(path);
    return { success: `Cash on hand at 31 October ${year} saved.`, version: newVersion };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002" || error.code === "P2034") return { error: "This cash balance changed in another window. Refresh and review it before saving." };
      return { error: "Unable to save the cash balance. Please try again." };
    }
    return { error: error instanceof Error ? error.message : "Unable to save the cash balance." };
  }
}
