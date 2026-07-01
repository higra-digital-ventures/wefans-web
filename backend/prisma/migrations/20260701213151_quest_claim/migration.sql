-- CreateTable
CREATE TABLE "QuestClaim" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestClaim_userId_idx" ON "QuestClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestClaim_questId_userId_key" ON "QuestClaim"("questId", "userId");
