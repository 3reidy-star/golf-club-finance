import { NextResponse } from "next/server";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import { generateAnnualPdf } from "@/lib/annual-accounts-pdf";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await invoiceUser()) return new NextResponse("Forbidden", { status: 403 });
  const params = new URL(request.url).searchParams;
  const code = params.get("account"), year = Number(params.get("year"));
  if ((code !== "MENS" && code !== "CLUB") || !Number.isInteger(year) || year < 2000 || year > 2100) return new NextResponse("Invalid account or year", { status: 400 });
  const approved = await prisma.annualAccountsApproval.findFirst({ where: { accountCode: code, year, signedAt: { not: null } }, orderBy: { signedAt: "desc" } });
  const bytes = approved?.signedPdf ? Buffer.from(approved.signedPdf, "base64") : await generateAnnualPdf(code, year);
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="the-essex-${code.toLowerCase()}-annual-accounts-${year}${approved ? "-approved" : ""}.pdf"`, "Cache-Control": "private, no-store" } });
}
