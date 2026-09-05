"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function deletePayout(
  payoutId: string,
) {
  const session = await auth();

  if (
    !session?.user ||
    session.user.role !== "ADMIN"
  ) {
    throw new Error(
      "Only an administrator can delete payouts.",
    );
  }

  const payout =
    await prisma.payoutRequest.findUnique({
      where: {
        id: payoutId,
      },
      select: {
        id: true,
      },
    });

  if (!payout) {
    throw new Error(
      "Payout not found.",
    );
  }

  await prisma.payoutRequest.delete({
    where: {
      id: payoutId,
    },
  });

  revalidatePath("/");
  revalidatePath(
    "/payouts/history",
  );
  revalidatePath(
    "/payouts/approval",
  );
  revalidatePath(
    "/payouts/top-ups",
  );
  revalidatePath(
    "/payouts/section-payments",
  );
  revalidatePath(
    "/payouts/completed",
  );
}
