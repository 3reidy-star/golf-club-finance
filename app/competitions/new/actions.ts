"use server";

import { prisma } from "@/lib/prisma";
import { buildMensCompetitionPreview } from "@/lib/mensCompetitionPreview";

type CreateCompetitionInput = {
  name: string;
  competitionDate: string;
  entrants: number;
  entryFee: number;
  intelligentGolfText: string;
  divisionTexts?: string[];
  grossResultsText?: string;
  twosPaidText?: string;
  twosWinnersText?: string;
  divisionCount?: 1 | 2 | 3;
  twosEntrantsOverride?: number | null;
  twosWinnersPresent?: boolean | null;
  notes?: string;
};

export async function createMensCompetitionFromImport(input: CreateCompetitionInput) {
  const name = input.name.trim();

  if (!name) throw new Error("Please enter a competition name.");
  if (!input.competitionDate) throw new Error("Please enter the competition date.");
  if (!input.intelligentGolfText.trim() && !input.divisionTexts?.some((text) => text.trim())) {
    throw new Error("Paste the Division 1 competition results first.");
  }

  const entrants = Number(input.entrants);
  if (entrants <= 0) throw new Error("Entrants must be greater than zero.");

  const entryFee = Number(input.entryFee);
  if (entryFee <= 0) throw new Error("Entry fee must be greater than zero.");

  const smallCompetition = entrants < 10;

  const preview = buildMensCompetitionPreview({
    rawText: input.intelligentGolfText,
    divisionTexts: input.divisionTexts,
    grossResultsText: input.grossResultsText,
    twosPaidText: input.twosPaidText,
    twosWinnersText: input.twosWinnersText,
    entrants,
    entryFee,
    divisionCount: input.divisionCount,
    twosEntrantsOverride: null,
    twosWinnersPresent: null,
  });

  if (preview.errors.length > 0) {
    throw new Error(preview.errors.join(" "));
  }

  const mensSection = await prisma.section.findUnique({ where: { code: "MENS" } });
  if (!mensSection) throw new Error("Men's section not found.");

  const user = await prisma.user.findUnique({ where: { email: "craig@example.com" } });
  if (!user) throw new Error("Treasurer user not found.");

  const reference = `COMP-${Date.now()}`;
  const twosEntrants = preview.importData.twosPaidPlayers.length;
  const twosWinners = preview.importData.twosWinners.length;

  return prisma.$transaction(async (tx) => {
    const competition = await tx.competition.create({
      data: {
        sectionId: mensSection.id,
        name,
        competitionDate: new Date(`${input.competitionDate}T12:00:00`),
        competitionType: "STANDARD",
        entrants,
        entryFee,
        prizeFundPercentage: 0.75,
        sectionPercentage: 0.25,
        paymentFeeRate: 0.04,
        grossPrize: entrants > 10 ? 10 : null,
        twosEntrants,
        twosEntryFee: preview.importData.twosEntryFee,
        twosWinners,
        overrideReason: input.notes?.trim() || null,
        createdById: user.id,
      },
    });

    const playerTopUps = preview.playerPayouts.map((player) => ({
      recipientType: "PLAYER" as const,
      recipientName: player.playerName,
      accountReference: player.awards
        .map((award) => `${award.description} £${award.amount.toFixed(2)}`)
        .join(" + "),
      amount: player.amount,
    }));

    const sectionTopUps = preview.sectionPayment > 0
      ? [
          {
            recipientType: "SECTION_ACCOUNT" as const,
            recipientName: "Men's Section",
            accountReference: name,
            amount: preview.sectionPayment,
          },
        ]
      : [];

    const payout = await tx.payoutRequest.create({
      data: {
        reference,
        sectionId: mensSection.id,
        status: "REQUESTED",
        calculationType: "COMPETITION",
        reason: name,
        competitionId: competition.id,
        players: entrants,
        amountPerPlayer: entryFee,
        grossAmount: preview.calculation.totalGrossReceipts,
        paymentFeeRate: 0.04,
        paymentFeeAmount: preview.calculation.totalPaymentFees,
        additionalFees: 0,
        netTopUpAmount: preview.calculation.totalNetPayout,
        requestedById: user.id,
        topUps: { create: [...playerTopUps, ...sectionTopUps] },
      },
    });

    return {
      competitionId: competition.id,
      payoutId: payout.id,
      reference: payout.reference,
    };
  });
}


export type ManualPayoutLine = {
  playerName: string;
  reason: string;
  amount: number;
};

export async function createMensCompetitionManual(input: {
  name: string;
  competitionDate: string;
  entrants: number;
  entryFee: number;
  playerPayouts: ManualPayoutLine[];
  sectionPayment: number;
  notes?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Please enter a competition name.");
  if (!input.competitionDate) throw new Error("Please enter the competition date.");

  const entrants = Number(input.entrants);
  const entryFee = Number(input.entryFee);
  if (entrants <= 0) throw new Error("Entrants must be greater than zero.");
  if (entryFee < 0) throw new Error("Entry fee cannot be negative.");

  const playerPayouts = input.playerPayouts
    .map((line) => ({
      playerName: line.playerName.trim(),
      reason: line.reason.trim() || "Competition prize",
      amount: Number(line.amount),
    }))
    .filter((line) => line.playerName && line.amount > 0);

  if (!playerPayouts.length) throw new Error("Add at least one player payout.");

  const sectionPayment = Number(input.sectionPayment || 0);
  if (sectionPayment < 0) throw new Error("Men's Section payment cannot be negative.");

  const competitionIncome = Math.round(entrants * entryFee * 100) / 100;
  const playerTotal = Math.round(playerPayouts.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  const totalPayout = Math.round((playerTotal + sectionPayment) * 100) / 100;

  const mensSection = await prisma.section.findUnique({ where: { code: "MENS" } });
  if (!mensSection) throw new Error("Men's section not found.");

  const user = await prisma.user.findUnique({ where: { email: "craig@example.com" } });
  if (!user) throw new Error("Treasurer user not found.");

  const reference = `COMP-MANUAL-${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    const competition = await tx.competition.create({
      data: {
        sectionId: mensSection.id,
        name,
        competitionDate: new Date(`${input.competitionDate}T12:00:00`),
        competitionType: "STANDARD",
        entrants,
        entryFee,
        prizeFundPercentage: 0,
        sectionPercentage: 0,
        paymentFeeRate: 0,
        grossPrize: null,
        twosEntrants: 0,
        twosEntryFee: 0,
        twosWinners: 0,
        overrideReason: input.notes?.trim() || "Manual competition payout",
        createdById: user.id,
      },
    });

    const payout = await tx.payoutRequest.create({
      data: {
        reference,
        sectionId: mensSection.id,
        status: "REQUESTED",
        calculationType: "COMPETITION",
        reason: name,
        competitionId: competition.id,
        players: entrants,
        amountPerPlayer: entryFee,
        grossAmount: competitionIncome,
        paymentFeeRate: 0,
        paymentFeeAmount: 0,
        additionalFees: 0,
        netTopUpAmount: totalPayout,
        requestedById: user.id,
        topUps: {
          create: [
            ...playerPayouts.map((line) => ({
              recipientType: "PLAYER" as const,
              recipientName: line.playerName,
              accountReference: line.reason,
              amount: line.amount,
            })),
            ...(sectionPayment > 0
              ? [{
                  recipientType: "SECTION_ACCOUNT" as const,
                  recipientName: "Men's Section",
                  accountReference: name,
                  amount: sectionPayment,
                }]
              : []),
          ],
        },
      },
    });

    return { competitionId: competition.id, payoutId: payout.id, reference: payout.reference };
  });
}
