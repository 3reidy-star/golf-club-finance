"use server";

import { PayoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function markPlayerTopUpComplete(
  topUpId: string,
) {
  const kevin = await prisma.user.findUnique({
    where: {
      email: "kevin@example.com",
    },
  });

  if (!kevin) {
    throw new Error("Kevin user not found.");
  }

  await prisma.$transaction(async (tx) => {
    const topUp = await tx.payoutTopUp.findUnique({
      where: {
        id: topUpId,
      },

      include: {
        payoutRequest: true,
      },
    });

    if (!topUp) {
      throw new Error("Top-up not found.");
    }

    if (topUp.recipientType !== "PLAYER") {
      throw new Error(
        "Kevin can only complete player top-ups.",
      );
    }

    if (
      topUp.payoutRequest.status !==
      PayoutStatus.APPROVED
    ) {
      throw new Error(
        "This payout is not awaiting top-up.",
      );
    }

    if (topUp.completed) {
      throw new Error(
        "This player top-up has already been completed.",
      );
    }

    await tx.payoutTopUp.update({
      where: {
        id: topUp.id,
      },

      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    const outstanding =
      await tx.payoutTopUp.count({
        where: {
          payoutRequestId:
            topUp.payoutRequestId,

          completed: false,
        },
      });

    if (outstanding === 0) {
      await tx.payoutRequest.update({
        where: {
          id: topUp.payoutRequestId,
        },

        data: {
          status: PayoutStatus.PAID,
          paidById: kevin.id,
          paidAt: new Date(),
        },
      });
    }
  });

  revalidatePath("/payouts/top-ups");
  revalidatePath("/payouts/section-payments");
  revalidatePath("/payouts/history");
  revalidatePath("/");
}