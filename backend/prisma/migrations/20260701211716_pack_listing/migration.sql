-- CreateTable
CREATE TABLE "PackListing" (
    "id" TEXT NOT NULL,
    "packInventoryId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackListing_packInventoryId_key" ON "PackListing"("packInventoryId");

-- CreateIndex
CREATE INDEX "PackListing_sellerId_idx" ON "PackListing"("sellerId");

-- CreateIndex
CREATE INDEX "PackListing_status_idx" ON "PackListing"("status");

-- AddForeignKey
ALTER TABLE "PackListing" ADD CONSTRAINT "PackListing_packInventoryId_fkey" FOREIGN KEY ("packInventoryId") REFERENCES "PackInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackListing" ADD CONSTRAINT "PackListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
