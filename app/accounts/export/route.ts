import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | boolean) {
  const text = String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TREASURER") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("account");
  if (requested !== null && requested !== "CLUB" && requested !== "MENS") {
    return new NextResponse("Invalid account", { status: 400 });
  }

  const accounts = await prisma.financeAccount.findMany({
    where: requested ? { code: requested } : undefined,
    include: {
      transactions: {
        orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { code: "asc" },
  });

  const lines: string[] = [];
  lines.push(["Date", "Account", "Description", "Category", "Money In", "Money Out", "Running Balance", "Reconciled", "Transaction ID", "Source Key", "Import Batch ID"].map(csvCell).join(","));

  for (const account of accounts) {
    let balance = Number(account.openingBalance);
    for (const row of account.transactions) {
      balance = Math.round((balance + Number(row.credit) - Number(row.debit)) * 100) / 100;
      const date = row.transactionDate.toISOString().slice(0, 10);
      lines.push([
        date, account.code, row.description, row.category,
        Number(row.credit).toFixed(2), Number(row.debit).toFixed(2),
        balance.toFixed(2), row.reconciled ? "Yes" : "No",
        row.id, row.sourceKey, row.importBatchId ?? "",
      ].map(csvCell).join(","));
    }
  }

  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
  const fileName = `golf-club-accounts-${requested?.toLowerCase() ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
