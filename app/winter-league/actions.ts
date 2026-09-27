"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function key(name: string) {
  return name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

function rows(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split(/\t|\|/).map((v) => v.trim()).filter(Boolean)
  ).filter((cells) => !cells.every((c) => /^[-: ]+$/.test(c)));
}

function nameFrom(cells: string[], positionExpected: boolean) {
  const start = positionExpected && /^\d+(?:st|nd|rd|th)?$/i.test(cells[0] ?? "") ? 1 : 0;
  return cells.slice(start).find((v) => /[a-z]/i.test(v) && !/^(pos|position|player|name|score|points)$/i.test(v)) ?? "";
}

async function requireTreasurer() {
  const s = await auth();

  if (
    !s?.user ||
    !["TREASURER", "ADMIN", "COMPETITIONS"].includes(s.user.role)
  ) {
    throw new Error("Competitions access only.");
  }
}

export async function importWinterLeaguePlayers(formData: FormData) {
  await requireTreasurer();
  const text = String(formData.get("players") ?? "");
  const names = rows(text).map((r) => nameFrom(r, false)).filter(Boolean);
  if (!names.length) throw new Error("No player names recognised.");
  for (const name of names) {
    const nameKey = key(name);
    if (!nameKey) continue;
    await prisma.winterLeaguePlayer.upsert({ where: { nameKey }, update: { name, active: true }, create: { name, nameKey } });
  }
  revalidatePath("/winter-league");
}

export async function importWinterLeagueRound(formData: FormData) {
  await requireTreasurer();
  const roundNo = Number(formData.get("roundNo"));
  if (!Number.isInteger(roundNo) || roundNo < 1 || roundNo > 6) throw new Error("Round must be 1 to 6.");
  const text = String(formData.get("results") ?? "");
  const parsed = rows(text);
  const players = await prisma.winterLeaguePlayer.findMany({ where: { active: true } });
  const byKey = new Map(players.map((p) => [p.nameKey, p]));
  const round = await prisma.winterLeagueRound.upsert({ where: { roundNo }, update: {}, create: { roundNo, name: `Round ${roundNo}` } });
  await prisma.winterLeagueResult.deleteMany({ where: { roundId: round.id } });

  let included = 0;
  for (const cells of parsed) {
    const rawPos = cells[0]?.match(/^\d+/)?.[0];
    if (!rawPos) continue;

    const originalPosition = Number(rawPos);
    const name = nameFrom(cells, true);
    const player = byKey.get(key(name));

    // Non-eligible players are ignored completely. Eligible players are
    // re-ranked in their finishing order, so the first eligible player gets
    // 20 points, the second eligible player 19 points, etc.
    if (!player) continue;

    included++;
    const eligiblePosition = included;
    const points = Math.max(0, 21 - eligiblePosition);

    await prisma.winterLeagueResult.create({
      data: {
        roundId: round.id,
        playerId: player.id,
        position: eligiblePosition,
        points,
        score: `Overall finish ${originalPosition}${cells.slice(2).length ? ` — ${cells.slice(2).join(" ")}` : ""}`,
      },
    });
  }
  revalidatePath("/winter-league");
}
