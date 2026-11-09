import { PDFDocument } from "pdf-lib";
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
  const summaryOnly = params.get("summary") === "1";
  let bytes = approved?.signedPdf ? Buffer.from(approved.signedPdf, "base64") : await generateAnnualPdf(code, year, summaryOnly);
  if (summaryOnly && approved?.signedPdf) {
    const source = await PDFDocument.load(bytes), summary = await PDFDocument.create();
    const [first] = await summary.copyPages(source, [0]); summary.addPage(first);
    bytes = Buffer.from(await summary.save());
  }
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="the-essex-${code.toLowerCase()}-annual-accounts-${year}${summaryOnly ? "-summary" : ""}${approved ? "-approved" : ""}.pdf"`, "Cache-Control": "private, no-store" } });
}
