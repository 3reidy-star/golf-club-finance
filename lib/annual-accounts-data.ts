import { prisma } from "@/lib/prisma";
import { calculateAnnualAccounts } from "./annual-accounts";
export async function loadAnnualAccounts(code: "MENS" | "CLUB", year: number) {
  const [account, cash, entries, reviews] = await Promise.all([
    prisma.financeAccount.findUnique({ where: { code }, include: { transactions: { where: { transactionDate: { lt: new Date(Date.UTC(year, 10, 1)) } }, include: { invoicePayments: { where: { removedAt: null }, select: { amountPence: true } } }, orderBy: { transactionDate: "asc" } } } }),
    prisma.cashYearEnd.findMany({ where: { accountCode: code, year: { in: [year - 2, year - 1, year] } } }),
    code === "MENS" ? prisma.charityEntry.findMany({ where: { accountCode: code } }) : Promise.resolve([]),
    prisma.annualAccountsReview.findMany({ where: { accountCode: code, year: { in: [year - 1, year] } } }),
  ]);
  if (!account) throw new Error("Account not found.");
  return { current: calculateAnnualAccounts(account, year, cash, entries, reviews), previous: calculateAnnualAccounts(account, year - 1, cash, entries, reviews) };
}
