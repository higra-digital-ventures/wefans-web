-- Pack pertence a um Set (coleção). O mint passa a sortear deste Set.
ALTER TABLE "Pack" ADD COLUMN "setId" TEXT;

ALTER TABLE "Pack" ADD CONSTRAINT "Pack_setId_fkey"
  FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Pack_setId_idx" ON "Pack"("setId");
