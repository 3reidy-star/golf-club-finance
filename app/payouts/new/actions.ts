"use server";

import {
  PayoutCalculationType,
  PayoutRecipientType,
  SectionCode,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type PlayerTopUpInput = {
  playerName: string;
  amount: number;
};

type CreatePayoutInput = {
  sectionCode: string;
  reason: string;
  calculationType: "PLAYERS_X_FEE" | "MANUAL_AMOUNT";
  players?: number;
  amountPerPlayer?: number;
  manualAmount?: number;
  playerTopUps?: PlayerTopUpInput[];
};

const allowedSectionCodes: SectionCode[] = [
  SectionCode.MENS,
  SectionCode.SENIORS,
  SectionCode.LADIES,
  SectionCode.JUNIORS,
];

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createPayoutRequest(input: CreatePayoutInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  const user = session.user;

  if (!["ADMIN", "TREASURER", "SECTION_USER"].includes(user.role)) {
    throw new Error("You are not authorised to submit payout requests.");
  }

  const reason = input.reason.trim();

  if (!reason) {
    throw new Error("Please enter a reason or competition.");
  }

  let sectionCode: SectionCode;

  if (user.role === "SECTION_USER") {
    const assignedSection = user.sectionCodes[0];

    if (!assignedSection) {
      throw new Error("Your login has not been assigned to a section.");
    }

    sectionCode = assignedSection as SectionCode;
  } else {
    sectionCode = input.sectionCode as SectionCode;
  }

  if (!allowedSectionCodes.includes(sectionCode)) {
    throw new Error("Invalid section.");
  }

  const section = await prisma.section.findUnique({
    where: { code: sectionCode },
  });

  if (!section) {
    throw new Error("Section not found.");
  }

  let grossAmount = 0;
  let calculationType:
    | typeof PayoutCalculationType.PLAYERS_X_FEE
    | typeof PayoutCalculationType.MANUAL_AMOUNT;

  if (input.calculationType === "PLAYERS_X_FEE") {
    const players = Number(input.players ?? 0);
    const amountPerPlayer = Number(input.amountPerPlayer ?? 0);

    if (players <= 0) {
      throw new Error("Players must be greater than zero.");
    }

    if (amountPerPlayer <= 0) {
      throw new Error("Amount per player must be greater than zero.");
    }

    grossAmount = players * amountPerPlayer;
    calculationType = PayoutCalculationType.PLAYERS_X_FEE;
  } else {
    grossAmount = Number(input.manualAmount ?? 0);

    if (grossAmount <= 0) {
      throw new Error("Manual amount must be greater than zero.");
    }

    calculationType = PayoutCalculationType.MANUAL_AMOUNT;
  }

  grossAmount = roundMoney(grossAmount);

  const paymentFeeRate = Number(section.defaultPaymentFee);
  const paymentFeeAmount = roundMoney(grossAmount * paymentFeeRate);
  const netTopUpAmount = roundMoney(grossAmount - paymentFeeAmount);

  const playerTopUps = (input.playerTopUps ?? [])
    .map((topUp) => ({
      playerName: topUp.playerName.trim(),
      amount: roundMoney(Number(topUp.amount)),
    }))
    .filter((topUp) => topUp.playerName || topUp.amount > 0);

  for (const topUp of playerTopUps) {
    if (!topUp.playerName) {
      throw new Error("Please enter the player name for every top-up.");
    }

    if (topUp.amount <= 0) {
      throw new Error(`Please enter a valid amount for ${topUp.playerName}.`);
    }
  }

  const playerTopUpTotal = roundMoney(
    playerTopUps.reduce((total, topUp) => total + topUp.amount, 0),
  );

  if (playerTopUpTotal > netTopUpAmount) {
    throw new Error(
      "Player top-ups exceed the amount available after the payment fee.",
    );
  }

  const sectionPayment = roundMoney(netTopUpAmount - playerTopUpTotal);
  const reference = `PAY-${Date.now()}`;

  const payout = await prisma.payoutRequest.create({
    data: {
      reference,
      sectionId: section.id,
      reason,
      calculationType,
      players:
        calculationType === PayoutCalculationType.PLAYERS_X_FEE
          ? Number(input.players)
          : null,
      amountPerPlayer:
        calculationType === PayoutCalculationType.PLAYERS_X_FEE
          ? Number(input.amountPerPlayer)
          : null,
      grossAmount,
      paymentFeeRate,
      paymentFeeAmount,
      additionalFees: 0,
      netTopUpAmount,
      requestedById: user.id,
      topUps: {
        create: [
          ...playerTopUps.map((topUp) => ({
            recipientType: PayoutRecipientType.PLAYER,
            recipientName: topUp.playerName,
            amount: topUp.amount,
          })),
          ...(sectionPayment > 0
            ? [
                {
                  recipientType: PayoutRecipientType.SECTION_ACCOUNT,
                  recipientName: section.name,
                  amount: sectionPayment,
                },
              ]
            : []),
        ],
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/payouts/approval");

  return {
    id: payout.id,
    reference: payout.reference,
  };
}
