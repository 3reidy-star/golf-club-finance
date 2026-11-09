import { redirect } from "next/navigation";
import { invoiceUser } from "@/lib/invoice-auth";
import { prisma } from "@/lib/prisma";
import AgmForm from "./AgmForm";
export const dynamic = "force-dynamic";
export default async function AgmPage({ searchParams }: { searchParams: Promise<{ account?: string; year?: string }> }) {
  if (!await invoiceUser()) redirect("/");
  const params = await searchParams;
  const year = Number(params.year ?? new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) redirect("/accounts/summary");
  const accountCode = params.account === "CLUB" ? "CLUB" : "MENS";
  const history = await prisma.annualAccountsApproval.findMany({ where: { accountCode, year, signedAt: { not: null } }, orderBy: { signedAt: "desc" }, select: { id: true, agmDate: true, signedAt: true } });
  return <main className="min-h-screen bg-slate-100 p-4 md:p-10"><div className="mx-auto max-w-4xl space-y-6">
    <a href={`/accounts/summary?year=${year}&account=${accountCode}`} className="underline">← Annual accounts</a>
    <h1 className="text-3xl font-bold">AGM sign-off: {accountCode === "MENS" ? "Men’s" : "Club"} {year}</h1>
    <p>Financial year: 1 November {year - 1} to 31 October {year}. Craig Reid and Paul Thompson should each draw their own signature on this device after reviewing the prepared PDF.</p>
    {history.length > 0 && <section className="rounded-xl bg-emerald-50 p-5"><h2 className="text-lg font-bold">Approved accounts</h2><p>The latest approved copy is used for annual PDF downloads. A revised approval requires a new prepared copy and both signatures.</p><ul className="mt-3 space-y-2">{history.map((item, index) => <li key={item.id}><a className="font-semibold underline" href={`/accounts/agm/${item.id}/pdf`} target="_blank" rel="noreferrer">{index === 0 ? "Latest approved copy" : "Earlier approved copy"} — AGM {item.agmDate?.split("-").reverse().join("/")}</a> · signed {item.signedAt?.toLocaleString("en-GB", { timeZone: "Europe/London" })}</li>)}</ul></section>}
    <AgmForm accountCode={accountCode} year={year} revised={history.length > 0} />
  </div></main>;
}
