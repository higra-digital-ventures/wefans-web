-- AlterTable
ALTER TABLE "FastBreakRun" ADD COLUMN "rewardPackId" TEXT;

-- AlterTable
ALTER TABLE "FastBreakDay" ADD COLUMN "closedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "FastBreakLineup_dayId_userId_key" ON "FastBreakLineup"("dayId", "userId");
