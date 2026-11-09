import { NextResponse } from "next/server";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await invoiceUser()) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const record = await prisma.annualAccountsApproval.findUnique({ where: { id } });
  if (!record) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(record.signedPdf ?? record.unsignedPdf, "base64"), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${record.accountCode.toLowerCase()}-${record.year}-${record.signedAt ? "approved" : "for-review"}.pdf"`, "Cache-Control": "private, no-store" } });
}
