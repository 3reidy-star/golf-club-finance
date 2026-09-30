import { buildMensImportPreview, type MensImportPreview } from "@/lib/intelligentGolfParser";
import { calculateMensCompetition, roundMoney } from "@/lib/payoutCalculator";

export function buildMensCompetitionPreview(input: {
  rawText: string;
  divisionTexts?: string[];
  grossResultsText?: string;
  twosPaidText?: string;
  twosWinnersText?: string;
  entrants: number;
  entryFee?: number;
  twosEntrantsOverride?: number | null;
  twosWinnersPresent?: boolean | null;
  divisionCount?: 1 | 2 | 3;
}): MensImportPreview {
  const combinedRawText = input.divisionTexts?.length
    ? input.divisionTexts
        .filter((text) => text.trim())
        .map((text, index) => `Division ${index + 1} Results\n${text}`)
        .join("\n\n") +
      (input.grossResultsText?.trim()
        ? `\n\nGross Results\n${input.grossResultsText}`
        : "") +
      (input.twosPaidText?.trim()
        ? `\n\nBirdie 2's (£1.00)\nFollowing players paid from an account\n${input.twosPaidText}`
        : "") +
      (input.twosWinnersText?.trim()
        ? `\n\n${input.twosWinnersText}`
        : "")
    : input.rawText;

  const base = buildMensImportPreview({
    rawText: combinedRawText,
    entrants: input.entrants,
    entryFee: input.entryFee,
    divisionCount: input.divisionCount,
  });

  // The new UI provides Birdie 2 entrants in their own box. Treat that box as
  // authoritative instead of asking the general Intelligent Golf parser to
  // infer which "paid from an account" list belongs to the 2s.
  if (input.twosPaidText !== undefined) {
    const paidPlayers = input.twosPaidText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !/^\*?the following players/i.test(line))
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);

    base.importData.twosPaidPlayers = Array.from(new Set(paidPlayers));
  }

  const paidPlayers = input.twosPaidText !== undefined
    ? Array.from(new Set(
        input.twosPaidText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#") && !/^\*?the following players/i.test(line))
          .map((line) => line.replace(/^[-*•]\s*/, "").trim())
          .filter(Boolean),
      ))
    : base.importData.twosPaidPlayers;

  base.importData.twosPaidPlayers = paidPlayers;

  const twosEntrants = paidPlayers.length;
  const twosWinners = base.importData.twosWinners.filter((winner) =>
    paidPlayers.some((name) => name.toLowerCase() === winner.playerName.toLowerCase()),
  );

  base.importData.twosWinners = twosWinners;

  const calculation = calculateMensCompetition({
    entrants: input.entrants,
    entryFee: input.entryFee,
    twosEntrants,
    twosEntryFee: 1,
    twosWinners: twosWinners.length,
    feeRate: 0.04,
    divisionCount: input.divisionCount,
  });

  const playerMap = new Map(
    base.playerPayouts.map((player) => [
      player.playerName.toLowerCase(),
      {
        ...player,
        awards: player.awards.filter((award) => !award.description.startsWith("Birdie 2")),
      },
    ]),
  );

  for (const [key, player] of playerMap) {
    player.amount = roundMoney(player.awards.reduce((total, award) => total + award.amount, 0));
    if (player.amount === 0) playerMap.delete(key);
  }

  for (const winner of twosWinners) {
    const key = winner.playerName.toLowerCase();
    const existing = playerMap.get(key) ?? {
      playerName: winner.playerName,
      amount: 0,
      awards: [],
    };
    existing.awards.push({
      description: winner.hole ? `Birdie 2 (${winner.hole})` : "Birdie 2",
      amount: calculation.twosIndividualPayout,
    });
    existing.amount = roundMoney(existing.amount + calculation.twosIndividualPayout);
    playerMap.set(key, existing);
  }

  const errors = base.errors.filter(
    (message) =>
      !message.includes("Birdie 2s winners were found") &&
      !message.includes("is shown as a Birdie 2 winner but is not in the list of players who paid"),
  );

  return {
    ...base,
    calculation,
    playerPayouts: Array.from(playerMap.values()).sort((a, b) =>
      a.playerName.localeCompare(b.playerName),
    ),
    sectionPayment: calculation.netSectionTopUp,
    errors,
  };
}
