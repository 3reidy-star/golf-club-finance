"use server";

import { randomUUID } from "node:crypto";
import { PayoutStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function completeSectionBatch(sectionId: string, ids: string[], expectedPence: number, formData: FormData) {
  const session = await auth();
  const user = session?.user?.id ? await prisma.user.findFirst({
    where: { id: session.user.id, active: true, role: { in: ["ADMIN", "TREASURER"] } },
  }) : null;
  if (!user) throw new Error("Not authorised to complete section payments.");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference || reference.length > 150 || !ids.length || new Set(ids).size !== ids.length) {
    throw new Error("Enter a payment reference (up to 150 characters).");
  }
  await prisma.$transaction(async (tx) => {
    const where = {
      id: { in: ids }, completed: false, recipientType: "SECTION_ACCOUNT" as const,
      payoutRequest: { sectionId, status: PayoutStatus.APPROVED },
    };
    const lines = await tx.payoutTopUp.findMany({ where });
    const total = lines.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0);
    if (lines.length !== ids.length || total !== expectedPence) {
      throw new Error("These payments have changed. Refresh the page and check the total before continuing.");
    }
    const completedAt = new Date();
    const updated = await tx.payoutTopUp.updateMany({ where, data: {
      completed: true, completedAt, sectionPaymentBatchId: randomUUID(), sectionPaymentReference: reference,
    } });
    if (updated.count !== ids.length) throw new Error("Payments changed. Refresh and try again.");
    for (const payoutRequestId of new Set(lines.map(line => line.payoutRequestId))) {
      const outstanding = await tx.payoutTopUp.count({ where: { payoutRequestId, completed: false } });
      if (outstanding === 0) await tx.payoutRequest.update({ where: { id: payoutRequestId }, data: {
        status: PayoutStatus.PAID, paidById: user.id, paidAt: completedAt,
      } });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  for (const path of ["/payouts/section-payments", "/payouts/top-ups", "/payouts/history", "/payouts/completed", "/"]) revalidatePath(path);
}
