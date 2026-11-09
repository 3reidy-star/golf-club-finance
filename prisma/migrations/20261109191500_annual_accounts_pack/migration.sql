CREATE TABLE "AnnualAccountsReview" (
 "id" TEXT NOT NULL PRIMARY KEY, "accountCode" "AccountCode" NOT NULL, "year" INTEGER NOT NULL,
 "debtorsPence" INTEGER, "otherCreditorsPence" INTEGER, "stockItems" JSONB NOT NULL DEFAULT '[]',
 "stockConfirmed" BOOLEAN NOT NULL DEFAULT false, "commentary" TEXT NOT NULL DEFAULT '',
 "version" INTEGER NOT NULL DEFAULT 1, "updatedById" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AnnualAccountsReview_accountCode_year_key" ON "AnnualAccountsReview"("accountCode", "year");
CREATE TABLE "AccountDateCorrection" (
 "id" TEXT NOT NULL PRIMARY KEY, "transactionId" TEXT NOT NULL UNIQUE,
 "originalDate" TIMESTAMP(3) NOT NULL, "correctedDate" TIMESTAMP(3) NOT NULL,
 "reason" TEXT NOT NULL, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- The source workbook places rows 504-512 in FY2025 between November 2024
-- and January 2025, but their December dates use 2025. Correct the year only.
-- Preserve each original date and import key. No money or source record is removed.
INSERT INTO "AccountDateCorrection" ("id","transactionId","originalDate","correctedDate","reason")
SELECT 'agm-date-' || t.id,t.id,t."transactionDate",t."transactionDate" - INTERVAL '1 year',
 'The Essex Accounts workbook: Mens TRs rows 504-512. December entries in FY2025 were dated one year late. Verified by adjacent November 2024 and January 2025 rows; net opening difference GBP 758.51.'
FROM "AccountTransaction" t WHERE t."accountCode"='MENS' AND t."transactionDate">='2025-12-01' AND t."transactionDate"<'2026-01-01'
AND t."sourceKey" IN (
 '9430bc11ea0947070857a29378e76b3bf86558b4020eb43b2047ffd05fce59f4',
 'c852c9814139fe3156970743570e8345be2e384f7e90ac2051fe70eae02978be',
 '775ccbe17d7985482c58cb906bd8653602906cf13982e502d1a6137a2ee9c208',
 'bb4484acb7eac2143340b45d63baf1e5495faf5091f45e907bf8e171df6cb052',
 '85a278155d57a07ef9fb23ade43be773d9454f8eabd3e2a6b1e0822b0addd1fe',
 '3d664c79f7aa4159eddac5bbaf594035b0516228d334029a95337c97c2a2c99c',
 'dafc32b007c06e086433f6f0a06c442f4c18e5da3e16580c41464ba0204bc64e',
 '71ea2a8eda621712d7f21b7e34ae1fa8a329fc874c65dc2e9d7db5bb767d06f8',
 '02ef73ad54e3e1379498cba29371d3e14cac0c1da852a29fa581498d5b4d45cc'
) ON CONFLICT ("transactionId") DO NOTHING;
UPDATE "AccountTransaction" t SET "transactionDate"=c."correctedDate","updatedAt"=CURRENT_TIMESTAMP
FROM "AccountDateCorrection" c WHERE t.id=c."transactionId" AND t."transactionDate"=c."originalDate";
-- Prior-year cash counts from the workbook; Club 2026 nil confirmed by Craig.
INSERT INTO "CashYearEnd" (id,"accountCode",year,"amountPence",note,version,"recordedById","recordedAt","updatedAt")
SELECT 'agm-cash-'||v.code||'-'||v.year,v.code::"AccountCode",v.year,0,v.note,1,'confirmed-year-end-review',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM (VALUES ('MENS',2024,'Source workbook: 24 YR Finalised cash nil.'),('MENS',2025,'Source workbook: Men 25 YR Final cash nil.'),('CLUB',2024,'Club account had not opened; no opening cash.'),('CLUB',2025,'Source workbook: Club 25 YR Final cash nil.'),('CLUB',2026,'Craig confirmed 9 November 2026: Club Account holds no cash; GBP245 belongs to Mens.')) AS v(code,year,note)
WHERE EXISTS(SELECT 1 FROM "FinanceAccount" WHERE code=v.code::"AccountCode")
ON CONFLICT ("accountCode",year) DO NOTHING;
INSERT INTO "CashYearEndHistory" (id,"cashCountId","amountPence",note,"recordedById","recordedAt",version)
SELECT 'agm-history-'||id,id,"amountPence",note,"recordedById","recordedAt",version FROM "CashYearEnd" WHERE id LIKE 'agm-cash-%'
ON CONFLICT ("cashCountId",version) DO NOTHING;
-- Current year: Craig confirms no other debtors/creditors beyond recorded funds.
INSERT INTO "AnnualAccountsReview" (id,"accountCode",year,"debtorsPence","otherCreditorsPence","updatedById","updatedAt")
SELECT 'agm-review-'||code||'-2026',code,2026,0,0,'confirmed-year-end-review',CURRENT_TIMESTAMP FROM "FinanceAccount"
ON CONFLICT ("accountCode",year) DO NOTHING;
