"use server";

import { PayoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function approvePayout(payoutId: string) {
  const treasurer = await prisma.user.findUnique({
    where: {
      email: "craig@example.com",
    },
  });

  if (!treasurer) {
    throw new Error("Treasurer user not found.");
  }

  const result = await prisma.payoutRequest.updateMany({
    where: {
      id: payoutId,
      status: PayoutStatus.REQUESTED,
    },
    data: {
      status: PayoutStatus.APPROVED,
      approvedById: treasurer.id,
      approvedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error("This payout has already been processed.");
  }

  revalidatePath("/payouts/approval");
  revalidatePath("/");
}