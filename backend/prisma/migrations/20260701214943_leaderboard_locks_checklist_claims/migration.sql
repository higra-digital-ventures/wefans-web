-- CreateTable
CREATE TABLE "LeaderboardLock" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistClaim" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardLock_momentId_key" ON "LeaderboardLock"("momentId");

-- CreateIndex
CREATE INDEX "LeaderboardLock_leaderboardId_idx" ON "LeaderboardLock"("leaderboardId");

-- CreateIndex
CREATE INDEX "LeaderboardLock_userId_idx" ON "LeaderboardLock"("userId");

-- CreateIndex
CREATE INDEX "ChecklistClaim_userId_idx" ON "ChecklistClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistClaim_checklistId_userId_key" ON "ChecklistClaim"("checklistId", "userId");
