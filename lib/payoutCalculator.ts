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

  if (entrants <= 10) {
    const [first, second] = splitPrizePot(
      prizeFund,
      [0.7, 0.3],
    );

    prizes.push(
      {
        key: "division-1-1",
        division: "Division 1",
        place: "1st",
        amount: first,
      },
      {
        key: "division-1-2",
        division: "Division 1",
        place: "2nd",
        amount: second,
      },
    );
  } else if (entrants <= 20) {
    const divisionPot = roundMoney(
      prizeFund - 10,
    );

    const [first, second, third] =
      splitPrizePot(
        divisionPot,
        [0.55, 0.3, 0.15],
      );

    prizes.push(
      {
        key: "gross-1",
        division: "Gross",
        place: "1st",
        amount: 10,
      },
      {
        key: "division-1-1",
        division: "Division 1",
        place: "1st",
        amount: first,
      },
      {
        key: "division-1-2",
        division: "Division 1",
        place: "2nd",
        amount: second,
      },
      {
        key: "division-1-3",
        division: "Division 1",
        place: "3rd",
        amount: third,
      },
    );
  } else if (entrants < 75) {
    const remainingPrizePence =
      toPence(prizeFund - 10);

    const divisionPots = splitPence(
      remainingPrizePence,
      2,
    ).map(fromPence);

    prizes.push({
      key: "gross-1",
      division: "Gross",
      place: "1st",
      amount: 10,
    });

    divisionPots.forEach((pot, index) => {
      const divisionNumber = index + 1;

      const [first, second, third] =
        splitPrizePot(
          pot,
          [0.55, 0.3, 0.15],
        );

      prizes.push(
        {
          key: `division-${divisionNumber}-1`,
          division: `Division ${divisionNumber}`,
          place: "1st",
          amount: first,
        },
        {
          key: `division-${divisionNumber}-2`,
          division: `Division ${divisionNumber}`,
          place: "2nd",
          amount: second,
        },
        {
          key: `division-${divisionNumber}-3`,
          division: `Division ${divisionNumber}`,
          place: "3rd",
          amount: third,
        },
      );
    });
  } else {
    const remainingPrizePence =
      toPence(prizeFund - 10);

    const divisionPots = splitPence(
      remainingPrizePence,
      3,
    ).map(fromPence);

    prizes.push({
      key: "gross-1",
      division: "Gross",
      place: "1st",
      amount: 10,
    });

    divisionPots.forEach((pot, index) => {
      const divisionNumber = index + 1;

      const [first, second] =
        splitPrizePot(
          pot,
          [0.7, 0.3],
        );

      prizes.push(
        {
          key: `division-${divisionNumber}-1`,
          division: `Division ${divisionNumber}`,
          place: "1st",
          amount: first,
        },
        {
          key: `division-${divisionNumber}-2`,
          division: `Division ${divisionNumber}`,
          place: "2nd",
          amount: second,
        },
      );
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