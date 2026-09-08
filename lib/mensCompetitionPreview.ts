import { buildMensImportPreview, type MensImportPreview } from "@/lib/intelligentGolfParser";
import { calculateMensCompetition, roundMoney } from "@/lib/payoutCalculator";

export function buildMensCompetitionPreview(input: {
  rawText: string;
  entrants: number;
  entryFee?: number;
  twosEntrantsOverride?: number | null;
  twosWinnersPresent?: boolean | null;
}): MensImportPreview {
  const base = buildMensImportPreview({
    rawText: input.rawText,
    entrants: input.entrants,
    entryFee: input.entryFee,
  });

  const useManualTwos = input.twosEntrantsOverride !== null && input.twosEntrantsOverride !== undefined;
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
