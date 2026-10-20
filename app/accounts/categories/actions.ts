"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountCategories, normaliseCategory } from "@/lib/account-categories";
import { revalidatePath } from "next/cache";
export type CategoryState = { error?: string; success?: string };
export async function addAccountCategory(_state: CategoryState, data: FormData): Promise<CategoryState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TREASURER") return { error: "Treasurer access only." };
  const user = await prisma.user.findFirst({ where: { id: session.user.id, role: "TREASURER", active: true }, select: { id: true } });
  if (!user) return { error: "Treasurer access only." };
  let category;
  try { category = normaliseCategory(String(data.get("name") ?? "")); } catch (e) { return { error: e instanceof Error ? e.message : "Enter a valid category." }; }
  const categories = await getAccountCategories();
  if (categories.some(c => c.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB") === category.nameKey)) return { error: "That category already exists." };
  try { await prisma.accountCategory.create({ data: category }); }
  catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "That category already exists." };
    return { error: "Unable to save the category. Please try again." };
  }
  revalidatePath("/accounts"); revalidatePath("/accounts/manual"); revalidatePath("/accounts/summary");
  return { success: `${category.name} added. It is now available for Club and Men's accounts.` };
}
