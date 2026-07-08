-- Config editável pela administração (taxas de royalty). Singleton.
CREATE TABLE "PlatformConfig" (
  "id"             TEXT NOT NULL,
  "platformFeeBps" INTEGER NOT NULL DEFAULT 500,
  "clubRoyaltyBps" INTEGER NOT NULL DEFAULT 500,
  "primaryClubBps" INTEGER NOT NULL DEFAULT 3000,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- linha única padrão
INSERT INTO "PlatformConfig" ("id", "platformFeeBps", "clubRoyaltyBps", "primaryClubBps", "updatedAt")
VALUES ('singleton', 500, 500, 3000, CURRENT_TIMESTAMP);
