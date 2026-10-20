import { getAccountCategories } from "@/lib/account-categories";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ManualForm from "./ManualForm";
export default async function ManualTransactionPage() {
 const session = await auth();
 if (!session?.user) redirect("/login");
 if (session.user.role !== "TREASURER") redirect("/");
 const categories = await getAccountCategories();
 return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-xl"><a href="/accounts" className="text-sm text-slate-600">← Back to accounts</a><h1 className="my-5 text-2xl font-bold">Add manual transaction</h1><p className="mb-4 text-sm text-slate-600">Use this for transactions missing from a bank import. Check for existing entries first to avoid duplicates.</p><ManualForm categories={categories}/></div></main>;
}