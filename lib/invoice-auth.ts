import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export async function invoiceUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TREASURER") return null;
  return prisma.user.findFirst({ where: { id: session.user.id, active: true, role: "TREASURER" }, select: { id: true } });
}
