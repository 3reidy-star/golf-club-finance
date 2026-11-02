CREATE TYPE "CharityEntryType" AS ENUM ('CONTRIBUTION', 'RECEIPT', 'COST', 'PAYMENT');
CREATE TABLE "CharityEntry" (
  "id" TEXT PRIMARY KEY,
  "accountCode" "AccountCode" NOT NULL,
  "type" "CharityEntryType" NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "amountPence" INTEGER NOT NULL CHECK ("amountPence" > 0),
  "description" TEXT NOT NULL,
  "transactionId" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedAt" TIMESTAMP(3),
  "removedById" TEXT,
  "removalReason" TEXT,
  CONSTRAINT "CharityEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "AccountTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CharityEntry_transaction_type_check" CHECK (("type" = 'CONTRIBUTION' AND "transactionId" IS NULL) OR ("type" IN ('RECEIPT', 'COST', 'PAYMENT') AND "transactionId" IS NOT NULL))
);
CREATE INDEX "CharityEntry_accountCode_effectiveDate_idx" ON "CharityEntry"("accountCode", "effectiveDate");
CREATE INDEX "CharityEntry_transactionId_idx" ON "CharityEntry"("transactionId");
CREATE UNIQUE INDEX "CharityEntry_one_active_allocation_per_transaction" ON "CharityEntry"("transactionId") WHERE "transactionId" IS NOT NULL AND "removedAt" IS NULL;
-- Craig's specified allocation of Awards Night proceeds, decided 27 October 2026.
INSERT INTO "CharityEntry" ("id", "accountCode", "type", "effectiveDate", "amountPence", "description") VALUES ('awards-night-charity-2026-10-27', 'MENS', 'CONTRIBUTION', '2026-10-27 00:00:00', 8300, 'Awards Night contribution to Thommo''s Charity');
