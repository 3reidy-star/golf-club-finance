import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import type { StockItem } from "@/lib/annual-accounts";
import ReviewForm from "./ReviewForm";
export const dynamic = "force-dynamic";
export default async function YearEndPage({ searchParams }: { searchParams: Promise<{ account?: string; year?: string }> }) {
  if (!await invoiceUser()) redirect("/");
  const params = await searchParams, year = Number(params.year ?? new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect("/accounts/summary");
  const accountCode = params.account === "CLUB" ? "CLUB" : "MENS";
  const review = await prisma.annualAccountsReview.findUnique({ where: { accountCode_year: { accountCode, year } } });
  return <main className="min-h-screen bg-slate-100 p-4 md:p-10"><div className="mx-auto max-w-4xl space-y-6"><a className="underline" href={`/accounts/summary?account=${accountCode}&year=${year}`}>← Annual accounts</a><h1 className="text-3xl font-bold">{accountCode === "MENS" ? "Men’s" : "Club"} year-end review {year}</h1><p>Save other balances, stock and commentary for the AGM pack. Previously approved copies stay fixed.</p><a className="inline-block underline" href={`/accounts/cash?year=${year}`}>Enter or review cash counts</a><ReviewForm accountCode={accountCode} year={year} review={review ? { version: review.version, debtorsPence: review.debtorsPence, otherCreditorsPence: review.otherCreditorsPence, stockConfirmed: review.stockConfirmed, stockItems: (Array.isArray(review.stockItems) ? review.stockItems : []) as StockItem[], commentary: review.commentary } : null} /></div></main>;
}
