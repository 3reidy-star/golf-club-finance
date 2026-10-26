"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function deletePayout(
  payoutId: string,
) {
  const session = await auth();

  const user = session?.user?.id ? await prisma.user.findFirst({
    where: { id: session.user.id, active: true, role: { in: ["ADMIN", "TREASURER"] } },
    select: { id: true },
  }) : null;
  if (!user) throw new Error("Only an administrator or treasurer can delete payouts.");
  if (!payoutId.trim()) throw new Error("Payout not found.");

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
  revalidatePath("/competitions");
  revalidatePath("/competitions/mens-payouts");
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
