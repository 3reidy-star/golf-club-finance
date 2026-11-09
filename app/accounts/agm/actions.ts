"use server";
import { revalidatePath } from "next/cache";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import { generateAnnualPdf } from "@/lib/annual-accounts-pdf";
import { signAnnualPdf, validateAgmDate } from "@/lib/agm-signatures";

export async function prepareAccounts(accountCode: string, year: number): Promise<{ id?: string; error?: string }> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  if ((accountCode !== "MENS" && accountCode !== "CLUB") || !Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Choose a valid account and year." };
  try {
    const bytes = await generateAnnualPdf(accountCode, year);
    const prepared = await prisma.annualAccountsApproval.create({ data: { accountCode, year, unsignedPdf: bytes.toString("base64"), preparedById: user.id } });
    return { id: prepared.id };
  } catch { return { error: "Unable to prepare the accounts. Please try again." }; }
}

export async function approveAccounts(id: string, date: string, treasurer: string, captain: string, confirmed: boolean): Promise<{ success?: boolean; error?: string }> {
  const user = await invoiceUser();
  if (!user) return { error: "Treasurer access only." };
  try {
    if (!confirmed) return { error: "Confirm that both signatories have reviewed and approved these accounts." };
    const record = await prisma.annualAccountsApproval.findUnique({ where: { id } });
    if (!record) return { error: "Prepared accounts not found. Prepare a new copy." };
    if (record.signedAt) return { error: "These accounts have already been signed. Refresh to view the approved copy." };
    const agmDate = validateAgmDate(date, record.year), signedAt = new Date();
    const signedPdf = await signAnnualPdf(record.unsignedPdf, [treasurer, captain], agmDate, signedAt, record.accountCode, record.year);
    const updated = await prisma.annualAccountsApproval.updateMany({ where: { id, signedAt: null }, data: { signedPdf, agmDate, signedAt, signedById: user.id, treasurerSignature: treasurer, captainSignature: captain } });
    if (updated.count !== 1) return { error: "These accounts were signed in another window. Refresh to view them." };
    revalidatePath("/accounts/agm"); revalidatePath("/accounts/summary");
    return { success: true };
  } catch { return { error: "Unable to approve. Check the AGM date and draw both signatures, then try again." }; }
}
