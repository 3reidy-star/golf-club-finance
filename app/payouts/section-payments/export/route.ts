import { NextResponse } from "next/server";
import { SectionCode } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorised", { status: 401 });
  const privileged = ["ADMIN", "TREASURER"].includes(session.user.role);
  if (!privileged && session.user.role !== "SECTION_USER") return new NextResponse("Forbidden", { status: 403 });
  const codes = session.user.sectionCodes.filter((code): code is SectionCode => Object.values(SectionCode).includes(code as SectionCode));
  if (!privileged && !codes.length) return new NextResponse("No section assigned", { status: 403 });
  const rows = await prisma.payoutTopUp.findMany({
    where: {
      recipientType: "SECTION_ACCOUNT", completed: true,
      ...(!privileged ? { payoutRequest: { section: { code: { in: codes } } } } : {}),
    },
    include: { payoutRequest: { include: { section: true, competition: true } } },
    orderBy: [{ completedAt: "desc" }, { createdAt: "asc" }],
  });
  const escape = (value: unknown) => {
    const str = String(value ?? "");
    const safe = /^[=+@\-\t\r]/.test(str) ? "'" + str : str;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const data = [
    ["Section", "Payment date", "Bank reference", "Batch ID", "Competition", "Competition date", "Payout reference", "Description", "Amount GBP"],
    ...rows.map(line => [
      line.payoutRequest.section.name,
      line.completedAt?.toISOString().slice(0, 10) ?? "",
      line.sectionPaymentReference ?? "",
      line.sectionPaymentBatchId ?? line.id,
      line.payoutRequest.competition?.name ?? "",
      line.payoutRequest.competition?.competitionDate.toISOString().slice(0, 10) ?? "",
      line.payoutRequest.reference,
      line.payoutRequest.reason,
      Number(line.amount).toFixed(2),
    ]),
  ].map(row => row.map(escape).join(",")).join("\r\n");
  return new NextResponse("\uFEFF" + data, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="section-payment-breakdowns.csv"',
    "Cache-Control": "private, no-store",
  } });
}
