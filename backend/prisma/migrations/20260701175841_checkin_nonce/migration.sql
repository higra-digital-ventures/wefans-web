-- CreateTable
CREATE TABLE "CheckinNonce" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckinNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckinNonce_value_key" ON "CheckinNonce"("value");

-- CreateIndex
CREATE INDEX "CheckinNonce_userId_idx" ON "CheckinNonce"("userId");
