-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TREASURER', 'TOPUP_ADMIN', 'SECTION_USER');

-- CreateEnum
CREATE TYPE "SectionCode" AS ENUM ('MENS', 'SENIORS', 'JUNIORS', 'LADIES', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutCalculationType" AS ENUM ('PLAYERS_X_FEE', 'MANUAL_AMOUNT', 'COMPETITION');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('STANDARD', 'MAJOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "code" "SectionCode" NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "defaultPaymentFee" DECIMAL(6,5) NOT NULL DEFAULT 0.04,
    "accountReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "SectionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "calculationType" "PayoutCalculationType" NOT NULL,
    "reason" TEXT NOT NULL,
    "competitionId" TEXT,
    "players" INTEGER,
    "amountPerPlayer" DECIMAL(10,2),
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "paymentFeeRate" DECIMAL(6,5) NOT NULL DEFAULT 0.04,
    "paymentFeeAmount" DECIMAL(10,2) NOT NULL,
    "additionalFees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netTopUpAmount" DECIMAL(10,2) NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNotes" TEXT,
    "paidById" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRule" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "entryFee" DECIMAL(10,2) NOT NULL,
    "prizeFundPercentage" DECIMAL(6,5) NOT NULL,
    "sectionPercentage" DECIMAL(6,5) NOT NULL,
    "paymentFeeRate" DECIMAL(6,5) NOT NULL DEFAULT 0.04,
    "twosEntryFee" DECIMAL(10,2),
    "deductTwosPaymentFee" BOOLEAN NOT NULL DEFAULT true,
    "grossPrize" DECIMAL(10,2),
    "major" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "competitionDate" TIMESTAMP(3) NOT NULL,
    "competitionType" "CompetitionType" NOT NULL DEFAULT 'STANDARD',
    "entrants" INTEGER NOT NULL,
    "entryFee" DECIMAL(10,2) NOT NULL,
    "prizeFundPercentage" DECIMAL(6,5) NOT NULL,
    "sectionPercentage" DECIMAL(6,5) NOT NULL,
    "paymentFeeRate" DECIMAL(6,5) NOT NULL DEFAULT 0.04,
    "grossPrize" DECIMAL(10,2),
    "twosEntrants" INTEGER NOT NULL DEFAULT 0,
    "twosEntryFee" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "twosWinners" INTEGER NOT NULL DEFAULT 0,
    "overrideReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Section_code_key" ON "Section"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SectionMember_userId_sectionId_key" ON "SectionMember"("userId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutRequest_reference_key" ON "PayoutRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutRequest_competitionId_key" ON "PayoutRequest"("competitionId");

-- CreateIndex
CREATE INDEX "PayoutRequest_sectionId_status_idx" ON "PayoutRequest"("sectionId", "status");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_requestedAt_idx" ON "PayoutRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "Competition_sectionId_competitionDate_idx" ON "Competition"("sectionId", "competitionDate");

-- AddForeignKey
ALTER TABLE "SectionMember" ADD CONSTRAINT "SectionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionMember" ADD CONSTRAINT "SectionMember_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRule" ADD CONSTRAINT "CompetitionRule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
