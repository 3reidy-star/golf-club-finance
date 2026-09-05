"use server";

import { PayoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export async function markSectionPaymentComplete(
  topUpId: string,
) {
  const treasurer =
    await prisma.user.findUnique({
      where: {
        email: "craig@example.com",
      },
    });

  if (!treasurer) {
    throw new Error(
      "Treasurer user not found.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const topUp =
        await tx.payoutTopUp.findUnique({
          where: {
            id: topUpId,
          },

          include: {
            payoutRequest: true,
          },
        });

      if (!topUp) {
        throw new Error(
          "Section payment not found.",
        );
      }

      if (
        topUp.recipientType !==
        "SECTION_ACCOUNT"
      ) {
        throw new Error(
          "This is not a section account payment.",
        );
      }

      if (
        topUp.payoutRequest.status !==
        PayoutStatus.APPROVED
      ) {
        throw new Error(
          "This payout is not approved.",
        );
      }

      if (topUp.completed) {
        throw new Error(
          "This section payment has already been completed.",
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
            id:
              topUp.payoutRequestId,
          },

          data: {
            status:
              PayoutStatus.PAID,

            paidById:
              treasurer.id,

            paidAt:
              new Date(),
          },
        });
      }
    },
  );

  revalidatePath(
    "/payouts/section-payments",
  );

  revalidatePath(
    "/payouts/top-ups",
  );

  revalidatePath(
    "/payouts/history",
  );

  revalidatePath("/");
}