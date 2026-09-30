export type Money = number;

export type PrizeLine = {
  key: string;
  division: string;
  place: string;
  amount: Money;
};

export function roundMoney(value: number): Money {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toPence(value: number) {
  return Math.round(value * 100);
}

function fromPence(value: number) {
  return value / 100;
}

function splitPence(totalPence: number, parts: number) {
  const base = Math.floor(totalPence / parts);
  const remainder = totalPence - base * parts;

  return Array.from({ length: parts }, (_, index) => {
    return base + (index < remainder ? 1 : 0);
  });
}

function splitPrizePot(
  pot: number,
  percentages: number[],
): number[] {
  const potPence = toPence(pot);

  const results: number[] = [];
  let allocated = 0;

  percentages.forEach((percentage, index) => {
    if (index === percentages.length - 1) {
      results.push(fromPence(potPence - allocated));
      return;
    }

    const amount = Math.round(potPence * percentage);

    allocated += amount;
    results.push(fromPence(amount));
  });

  return results;
}

export function calculateSimplePayout(input: {
  players?: number;
  amountPerPlayer?: number;
  grossAmount?: number;
  feeRate?: number;
}) {
  const feeRate = input.feeRate ?? 0.04;

  const gross =
    input.grossAmount ??
    (input.players ?? 0) *
      (input.amountPerPlayer ?? 0);

  const grossAmount = roundMoney(gross);

  const paymentFeeAmount = roundMoney(
    grossAmount * feeRate,
  );

  const netTopUpAmount = roundMoney(
    grossAmount - paymentFeeAmount,
  );

  return {
    grossAmount,
    feeRate,
    paymentFeeAmount,
    netTopUpAmount,
  };
}

export type MensCompetitionInput = {
  entrants: number;
  entryFee?: number;
  twosEntrants?: number;
  twosEntryFee?: number;
  twosWinners?: number;
  feeRate?: number;
  divisionCount?: 1 | 2 | 3;
};

export function calculateMensCompetition(
  input: MensCompetitionInput,
) {
  const entrants = Number(input.entrants || 0);
  const entryFee = Number(input.entryFee ?? 5);
  const feeRate = Number(input.feeRate ?? 0.04);

  const twosEntrants = Number(
    input.twosEntrants || 0,
  );

  const twosEntryFee = Number(
    input.twosEntryFee ?? 1,
  );

  const twosWinners = Number(
    input.twosWinners || 0,
  );

  const competitionIncome = roundMoney(
    entrants * entryFee,
  );

  const prizeFund = roundMoney(
    competitionIncome * 0.75,
  );

  const sectionShare = roundMoney(
    competitionIncome * 0.25,
  );

  const competitionPaymentFee = roundMoney(
    competitionIncome * feeRate,
  );

  const twosPot = roundMoney(
    twosEntrants * twosEntryFee,
  );

  const twosPaymentFee = roundMoney(
    twosPot * feeRate,
  );

  const twosIndividualPayout =
    twosWinners > 0
      ? roundMoney(twosPot / twosWinners)
      : 0;

  const netSectionTopUp = roundMoney(
    sectionShare -
      competitionPaymentFee -
      twosPaymentFee,
  );

  const prizes: PrizeLine[] = [];
  const divisionCount = input.divisionCount ?? (
    entrants <= 20 ? 1 : entrants < 75 ? 2 : 3
  );

  if (entrants <= 10 && divisionCount === 1) {
    const [first, second] = splitPrizePot(prizeFund, [0.7, 0.3]);
    prizes.push(
      { key: "division-1-1", division: "Division 1", place: "1st", amount: first },
      { key: "division-1-2", division: "Division 1", place: "2nd", amount: second },
    );
  } else {
    const grossPrize = entrants > 10 ? 10 : 0;
    const remainingPrizePence = toPence(prizeFund - grossPrize);
    const divisionPots = splitPence(remainingPrizePence, divisionCount).map(fromPence);

    if (grossPrize > 0) {
      prizes.push({ key: "gross-1", division: "Gross", place: "1st", amount: grossPrize });
    }

    divisionPots.forEach((pot, index) => {
      const divisionNumber = index + 1;
      const percentages = divisionCount === 3 && entrants >= 75 ? [0.7, 0.3] : [0.55, 0.3, 0.15];
      const amounts = splitPrizePot(pot, percentages);

      amounts.forEach((amount, placeIndex) => {
        prizes.push({
          key: `division-${divisionNumber}-${placeIndex + 1}`,
          division: `Division ${divisionNumber}`,
          place: ["1st", "2nd", "3rd"][placeIndex],
          amount,
        });
      });
    });
  }

  const competitionPrizeTotal = roundMoney(
    prizes.reduce(
      (total, prize) => total + prize.amount,
      0,
    ),
  );

  const twosPayoutTotal = roundMoney(
    twosPot,
  );

  const totalPlayerPayout = roundMoney(
    competitionPrizeTotal +
      twosPayoutTotal,
  );

  const totalGrossReceipts = roundMoney(
    competitionIncome + twosPot,
  );

  const totalPaymentFees = roundMoney(
    competitionPaymentFee +
      twosPaymentFee,
  );

  const totalNetPayout = roundMoney(
    competitionPrizeTotal +
      twosPayoutTotal +
      netSectionTopUp,
  );

  return {
    entrants,
    entryFee,

    competitionIncome,
    prizeFund,
    sectionShare,
    competitionPaymentFee,

    twosEntrants,
    twosEntryFee,
    twosWinners,
    twosPot,
    twosPaymentFee,
    twosIndividualPayout,
    twosPayoutTotal,

    netSectionTopUp,

    competitionPrizeTotal,
    totalPlayerPayout,

    totalGrossReceipts,
    totalPaymentFees,
    totalNetPayout,

    prizes,
  };
}