"use server";

import { prisma } from "@/lib/prisma";

import {
  buildMensImportPreview,
} from "@/lib/intelligentGolfParser";

type CreateCompetitionInput = {
  name: string;
  competitionDate: string;

  entrants: number;
  entryFee: number;

  intelligentGolfText: string;

  notes?: string;
};

export async function createMensCompetitionFromImport(
  input: CreateCompetitionInput,
) {
  const name =
    input.name.trim();

  if (!name) {
    throw new Error(
      "Please enter a competition name.",
    );
  }

  if (!input.competitionDate) {
    throw new Error(
      "Please enter the competition date.",
    );
  }

  if (
    !input.intelligentGolfText.trim()
  ) {
    throw new Error(
      "Paste the Intelligent Golf competition information first.",
    );
  }

  const entrants =
    Number(input.entrants);

  if (entrants <= 0) {
    throw new Error(
      "Entrants must be greater than zero.",
    );
  }

  const entryFee =
    Number(input.entryFee);

  if (entryFee <= 0) {
    throw new Error(
      "Entry fee must be greater than zero.",
    );
  }

  const preview =
    buildMensImportPreview({
      rawText:
        input.intelligentGolfText,

      entrants,
      entryFee,
    });

  if (
    preview.errors.length > 0
  ) {
    throw new Error(
      preview.errors.join(" "),
    );
  }

  const mensSection =
    await prisma.section.findUnique({
      where: {
        code: "MENS",
      },
    });

  if (!mensSection) {
    throw new Error(
      "Men's section not found.",
    );
  }

  // Temporary until authentication is added.
  const user =
    await prisma.user.findUnique({
      where: {
        email:
          "craig@example.com",
      },
    });

  if (!user) {
    throw new Error(
      "Treasurer user not found.",
    );
  }

  const reference =
    `COMP-${Date.now()}`;

  return prisma.$transaction(
    async (tx) => {
      const competition =
        await tx.competition.create({
          data: {
            sectionId:
              mensSection.id,

            name,

            competitionDate:
              new Date(
                `${input.competitionDate}T12:00:00`,
              ),

            competitionType:
              "STANDARD",

            entrants,

            entryFee,

            prizeFundPercentage:
              0.75,

            sectionPercentage:
              0.25,

            paymentFeeRate:
              0.04,

            grossPrize:
              entrants > 10
                ? 10
                : null,

            twosEntrants:
              preview.importData
                .twosPaidPlayers
                .length,

            twosEntryFee:
              preview.importData
                .twosEntryFee,

            twosWinners:
              preview.importData
                .twosWinners
                .length,

            overrideReason:
              input.notes?.trim() ||
              null,

            createdById:
              user.id,
          },
        });

      const playerTopUps =
        preview.playerPayouts.map(
          (player) => ({
            recipientType:
              "PLAYER" as const,

            recipientName:
              player.playerName,

            accountReference:
              player.awards
                .map(
                  (award) =>
                    `${award.description} £${award.amount.toFixed(
                      2,
                    )}`,
                )
                .join(" + "),

            amount:
              player.amount,
          }),
        );

      const sectionTopUps =
        preview.sectionPayment > 0
          ? [
              {
                recipientType:
                  "SECTION_ACCOUNT" as const,

                recipientName:
                  "Men's Section",

                accountReference:
                  name,

                amount:
                  preview.sectionPayment,
              },
            ]
          : [];

      const topUps = [
        ...playerTopUps,
        ...sectionTopUps,
      ];

      const payout =
        await tx.payoutRequest.create({
          data: {
            reference,

            sectionId:
              mensSection.id,

            status:
              "REQUESTED",

            calculationType:
              "COMPETITION",

            reason:
              name,

            competitionId:
              competition.id,

            players:
              entrants,

            amountPerPlayer:
              entryFee,

            grossAmount:
              preview.calculation
                .totalGrossReceipts,

            paymentFeeRate:
              0.04,

            paymentFeeAmount:
              preview.calculation
                .totalPaymentFees,

            additionalFees:
              0,

            netTopUpAmount:
              preview.calculation
                .totalNetPayout,

            requestedById:
              user.id,

            topUps: {
              create: topUps,
            },
          },
        });

      return {
        competitionId:
          competition.id,

        payoutId:
          payout.id,

        reference:
          payout.reference,
      };
    },
  );
}