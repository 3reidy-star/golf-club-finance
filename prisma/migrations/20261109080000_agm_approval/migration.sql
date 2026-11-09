CREATE TABLE "AnnualAccountsApproval" (
 "id" TEXT NOT NULL,
 "accountCode" "AccountCode" NOT NULL,
 "year" INTEGER NOT NULL,
 "unsignedPdf" TEXT NOT NULL,
 "signedPdf" TEXT,
 "agmDate" TEXT,
 "treasurerName" TEXT NOT NULL DEFAULT 'Craig Reid',
 "captainName" TEXT NOT NULL DEFAULT 'Paul Thompson',
 "treasurerSignature" TEXT,
 "captainSignature" TEXT,
 "preparedById" TEXT NOT NULL,
 "preparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "signedById" TEXT,
 "signedAt" TIMESTAMP(3),
 CONSTRAINT "AnnualAccountsApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnnualAccountsApproval_accountCode_year_signedAt_idx" ON "AnnualAccountsApproval"("accountCode", "year", "signedAt");
