CREATE TABLE "CashYearEnd" (
  "id" TEXT NOT NULL,
  "accountCode" "AccountCode" NOT NULL,
  "year" INTEGER NOT NULL CHECK ("year" BETWEEN 2000 AND 2100),
  "amountPence" INTEGER NOT NULL CHECK ("amountPence" >= 0),
  "note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "recordedById" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashYearEnd_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashYearEnd_accountCode_fkey" FOREIGN KEY ("accountCode") REFERENCES "FinanceAccount"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CashYearEnd_accountCode_year_key" ON "CashYearEnd"("accountCode", "year");
CREATE TABLE "CashYearEndHistory" (
  "id" TEXT NOT NULL,
  "cashCountId" TEXT NOT NULL,
  "amountPence" INTEGER NOT NULL,
  "note" TEXT NOT NULL,
  "recordedById" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL,
  CONSTRAINT "CashYearEndHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashYearEndHistory_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "CashYearEnd"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CashYearEndHistory_cashCountId_version_key" ON "CashYearEndHistory"("cashCountId", "version");
