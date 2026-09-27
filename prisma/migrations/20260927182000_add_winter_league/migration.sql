CREATE TABLE "WinterLeaguePlayer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameKey" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WinterLeaguePlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WinterLeagueRound" (
  "id" TEXT NOT NULL,
  "roundNo" INTEGER NOT NULL,
  "name" TEXT,
  "playedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WinterLeagueRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WinterLeagueResult" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "score" TEXT,
  "points" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WinterLeagueResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WinterLeaguePlayer_nameKey_key" ON "WinterLeaguePlayer"("nameKey");
CREATE UNIQUE INDEX "WinterLeagueRound_roundNo_key" ON "WinterLeagueRound"("roundNo");
CREATE UNIQUE INDEX "WinterLeagueResult_roundId_playerId_key" ON "WinterLeagueResult"("roundId", "playerId");
CREATE INDEX "WinterLeagueResult_playerId_idx" ON "WinterLeagueResult"("playerId");
ALTER TABLE "WinterLeagueResult" ADD CONSTRAINT "WinterLeagueResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "WinterLeagueRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WinterLeagueResult" ADD CONSTRAINT "WinterLeagueResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "WinterLeaguePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
