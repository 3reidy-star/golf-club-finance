import { NextResponse } from "next/server";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import { createInvoicePdf } from "@/lib/invoice-pdf";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await invoiceUser()) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, payments: true } });
  if (!invoice) return new NextResponse("Invoice not found", { status: 404 });
  const bytes = await createInvoicePdf(invoice);
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.number ?? "draft-invoice"}.pdf"`, "Cache-Control": "private, no-store" } });
}
