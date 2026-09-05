-- CreateEnum
CREATE TYPE "PayoutRecipientType" AS ENUM ('SECTION_ACCOUNT', 'PLAYER');

-- CreateTable
CREATE TABLE "PayoutTopUp" (
    "id" TEXT NOT NULL,
    "payoutRequestId" TEXT NOT NULL,
    "recipientType" "PayoutRecipientType" NOT NULL,
    "recipientName" TEXT NOT NULL,
    "accountReference" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutTopUp_payoutRequestId_idx" ON "PayoutTopUp"("payoutRequestId");

-- CreateIndex
CREATE INDEX "PayoutTopUp_completed_idx" ON "PayoutTopUp"("completed");

-- AddForeignKey
ALTER TABLE "PayoutTopUp" ADD CONSTRAINT "PayoutTopUp_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
