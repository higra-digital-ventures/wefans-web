-- Royalties: parte do valor vai para os times (parceria/licenciamento).
ALTER TABLE "Team" ADD COLUMN "earningsCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "TeamEarning" (
  "id"          TEXT NOT NULL,
  "teamId"      TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "kind"        TEXT NOT NULL,
  "momentId"    TEXT,
  "memo"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamEarning_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamEarning_teamId_idx" ON "TeamEarning"("teamId");

ALTER TABLE "TeamEarning" ADD CONSTRAINT "TeamEarning_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
