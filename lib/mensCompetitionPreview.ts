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

  const useManualTwos = input.twosEntrantsOverride !== null && input.twosEntrantsOverride !== undefined;
  const hasImportedTwos = base.importData.twosPaidPlayers.length > 0;

  // If no Birdie 2s paid-player list was pasted, do not infer a 2s pot from
  // winners or other competition text. Treat it as zero unless the user has
  // explicitly entered a manual 2s entrant count.
  if (!useManualTwos && !hasImportedTwos) {
    const calculation = calculateMensCompetition({
      entrants: input.entrants,
      entryFee: input.entryFee,
      twosEntrants: 0,
      twosEntryFee: base.importData.twosEntryFee,
      twosWinners: 0,
      feeRate: 0.04,
    });

    const errors = base.errors.filter(
      (message) =>
        !message.includes("Birdie 2s winners were found") &&
        !message.includes("is shown as a Birdie 2 winner but is not in the list of players who paid"),
    );

    const playerPayouts = base.playerPayouts
      .map((player) => ({
        ...player,
        awards: player.awards.filter((award) => !award.description.startsWith("Birdie 2")),
      }))
      .map((player) => ({
        ...player,
        amount: roundMoney(player.awards.reduce((total, award) => total + award.amount, 0)),
      }))
      .filter((player) => player.amount > 0);

    return {
      ...base,
      calculation,
      playerPayouts,
      sectionPayment: calculation.netSectionTopUp,
      errors,
    };
  }

  if (!useManualTwos) return base;

  const twosEntrants = Math.max(0, Number(input.twosEntrantsOverride ?? 0));
  const twosWinnerCount = input.twosWinnersPresent === false ? 0 : base.importData.twosWinners.length;

  const calculation = calculateMensCompetition({
    entrants: input.entrants,
    entryFee: input.entryFee,
    twosEntrants,
    twosEntryFee: base.importData.twosEntryFee,
    twosWinners: twosWinnerCount,
    feeRate: 0.04,
  });

  const errors = base.errors.filter(
    (message) =>
      !message.includes("Birdie 2s winners were found") &&
      !message.includes("is shown as a Birdie 2 winner but is not in the list of players who paid"),
  );

  if (input.twosWinnersPresent === true && base.importData.twosWinners.length === 0) {
    errors.push("You selected that there were Birdie 2s winners, but no winner was recognised in the pasted Intelligent Golf information.");
  }

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

  if (input.twosWinnersPresent !== false && twosWinnerCount > 0) {
    for (const winner of base.importData.twosWinners) {
      const key = winner.playerName.toLowerCase();
      const existing = playerMap.get(key) ?? {
        playerName: winner.playerName,
        amount: 0,
        awards: [],
      };
      const amount = calculation.twosIndividualPayout;
      existing.awards.push({
        description: winner.hole ? `Birdie 2 (${winner.hole})` : "Birdie 2",
        amount,
      });
      existing.amount = roundMoney(existing.amount + amount);
      playerMap.set(key, existing);
    }
  }

  return {
    ...base,
    calculation,
    playerPayouts: Array.from(playerMap.values()).sort((a, b) => a.playerName.localeCompare(b.playerName)),
    sectionPayment: calculation.netSectionTopUp,
    errors,
  };
}
