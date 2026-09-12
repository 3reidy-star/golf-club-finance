ALTER TABLE "AccountTransaction"
ADD COLUMN "reconciled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "AccountTransaction_accountCode_reconciled_idx"
ON "AccountTransaction"("accountCode", "reconciled");
