import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { importWinterLeaguePlayers, importWinterLeagueRound } from "./actions";

export const dynamic = "force-dynamic";

export default async function WinterLeaguePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["TREASURER", "ADMIN", "COMPETITIONS"].includes(session.user.role)) redirect("/");

  const [players, rounds] = await Promise.all([
    prisma.winterLeaguePlayer.findMany({ where: { active: true }, include: { results: { include: { round: true } } }, orderBy: { name: "asc" } }),
    prisma.winterLeagueRound.findMany({ include: { results: true }, orderBy: { roundNo: "asc" } }),
  ]);

  const standings = players.map((player) => {
    const roundPoints = Array.from({ length: 6 }, (_, i) => player.results.find((r) => r.round.roundNo === i + 1)?.points ?? null);
    const counted = roundPoints.filter((p): p is number => p !== null).sort((a,b) => b-a).slice(0,5);
    return { player, roundPoints, total: counted.reduce((a,b) => a+b,0), played: roundPoints.filter((p) => p !== null).length };
  }).sort((a,b) => b.total-a.total || b.played-a.played || a.player.name.localeCompare(b.player.name));

  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-7xl">
    <a href="/" className="text-sm font-medium text-slate-600">← Dashboard</a>
    <div className="my-7"><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Competitions</p><h1 className="mt-2 text-3xl font-bold">Winter League Results</h1><p className="mt-2 text-slate-600">20 points for 1st, 19 for 2nd and so on. Overall standings use each player's best 5 scores from the 6 rounds. Only players in the overall entrants list are included.</p></div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">1. Overall Winter League players</h2><p className="mt-1 text-sm text-slate-500">Paste the master table/list first. This is the eligibility list.</p><form action={importWinterLeaguePlayers} className="mt-4"><textarea name="players" rows={9} required className="w-full rounded-lg border p-3 text-sm" placeholder="Paste overall player table here..." /><button className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Import eligible players</button></form><p className="mt-3 text-xs text-slate-500">{players.length} eligible players currently loaded.</p></section>
      <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">2. Import a round</h2><p className="mt-1 text-sm text-slate-500">Paste the competition results. Anyone not in the eligible player list is ignored.</p><form action={importWinterLeagueRound} className="mt-4"><select name="roundNo" className="w-full rounded-lg border p-2 text-sm">{[1,2,3,4,5,6].map((n)=><option key={n} value={n}>Round {n}{rounds.some((r)=>r.roundNo===n) ? " — imported" : ""}</option>)}</select><textarea name="results" rows={7} required className="mt-3 w-full rounded-lg border p-3 text-sm" placeholder="Paste competition results table here..." /><button className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Import / replace round</button></form></section>
    </div>

    <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b p-4"><h2 className="font-semibold">Overall standings</h2><p className="mt-1 text-xs text-slate-500">Best 5 of 6 highlighted by the total. A 6th, lower score is automatically dropped.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Pos</th><th className="p-3 text-left">Player</th>{[1,2,3,4,5,6].map((n)=><th key={n} className="p-3 text-center">R{n}</th>)}<th className="p-3 text-right">Best 5</th></tr></thead><tbody className="divide-y">{standings.map((s,i)=><tr key={s.player.id}><td className="p-3 font-semibold">{i+1}</td><td className="p-3 font-medium">{s.player.name}</td>{s.roundPoints.map((p,i)=><td key={i} className="p-3 text-center">{p ?? "—"}</td>)}<td className="p-3 text-right text-lg font-bold">{s.total}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
