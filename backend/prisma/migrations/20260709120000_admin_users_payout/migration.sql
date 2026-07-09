-- Gestão de usuários (suspensão) + payout de royalties pros times.
ALTER TABLE "User" ADD COLUMN "suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "paidOutCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeamEarning" ADD COLUMN "paidAt" TIMESTAMP(3);
