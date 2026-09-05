CREATE TYPE "AccountCode" AS ENUM ('CLUB', 'MENS');

CREATE TABLE "FinanceAccount" (
  "code" "AccountCode" NOT NULL,
  "name" TEXT NOT NULL,
  "openingDate" TIMESTAMP(3) NOT NULL,
  "openingBalance" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "AccountImportBatch" (
  "id" TEXT NOT NULL,
  "accountCode" "AccountCode" NOT NULL,
  "fileName" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL,
  "importedById" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountTransaction" (
  "id" TEXT NOT NULL,
  "accountCode" "AccountCode" NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "category" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "importBatchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountTransaction_sourceKey_key" ON "AccountTransaction"("sourceKey");
CREATE INDEX "AccountTransaction_accountCode_transactionDate_idx" ON "AccountTransaction"("accountCode", "transactionDate");
CREATE INDEX "AccountTransaction_accountCode_category_idx" ON "AccountTransaction"("accountCode", "category");
CREATE INDEX "AccountImportBatch_accountCode_importedAt_idx" ON "AccountImportBatch"("accountCode", "importedAt");

ALTER TABLE "AccountImportBatch" ADD CONSTRAINT "AccountImportBatch_accountCode_fkey" FOREIGN KEY ("accountCode") REFERENCES "FinanceAccount"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountImportBatch" ADD CONSTRAINT "AccountImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_accountCode_fkey" FOREIGN KEY ("accountCode") REFERENCES "FinanceAccount"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "AccountImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FinanceAccount" ("code","name","openingDate","openingBalance","updatedAt") VALUES
('CLUB','Club Account','2025-07-16T00:00:00.000Z',0.00,CURRENT_TIMESTAMP),
('MENS','Men''s Account','2023-11-27T00:00:00.000Z',2634.93,CURRENT_TIMESTAMP);