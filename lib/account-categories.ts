import { prisma } from "@/lib/prisma";
import { ACCOUNT_CATEGORIES } from "@/app/accounts/categories";
export async function getAccountCategories(): Promise<string[]> {
  const [custom, used] = await Promise.all([
    prisma.accountCategory.findMany({ select: { name: true } }),
    prisma.accountTransaction.findMany({ distinct: ["category"], select: { category: true } }),
  ]);
  const categories = new Set<string>([...ACCOUNT_CATEGORIES, ...custom.map(c => c.name), ...used.map(c => c.category)]);
  return [...categories].sort((a, b) => a === "Uncategorised" ? -1 : b === "Uncategorised" ? 1 : a.localeCompare(b, "en-GB", { sensitivity: "base", numeric: true }));
}
export function normaliseCategory(value: string) {
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!name || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw new Error("Enter a category name between 1 and 80 characters.");
  if (name.toLowerCase() === "all") throw new Error("Choose a different name; All is reserved for filters.");
  return { name, nameKey: name.toLocaleLowerCase("en-GB") };
}
