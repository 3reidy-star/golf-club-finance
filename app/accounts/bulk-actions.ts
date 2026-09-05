"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CATEGORIES } from "./categories";

export async function saveTransactionCategories(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TREASURER") {
    throw new Error("Treasurer access only.");
  }

  const returnToRaw = String(formData.get("returnTo") ?? "/accounts");
  const returnTo =
    returnToRaw.startsWith("/accounts") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : "/accounts";

  const updates: Array<{ id: string; category: string }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("category:")) continue;

    const id = key.slice("category:".length);
    const category = String(value);

    if (
      id &&
      ACCOUNT_CATEGORIES.includes(
        category as (typeof ACCOUNT_CATEGORIES)[number],
      )
    ) {
      updates.push({ id, category });
    }
  }

  if (updates.length === 0) {
    redirect(returnTo);
  }

  await prisma.$transaction(
    updates.map((update) =>
      prisma.accountTransaction.update({
        where: { id: update.id },
        data: { category: update.category },
      }),
    ),
  );

  revalidatePath("/accounts", "page");
  revalidatePath("/accounts/summary", "page");
  redirect(returnTo);
}
