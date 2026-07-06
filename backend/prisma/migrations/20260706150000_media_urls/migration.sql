-- Mídia de teste (Wikimedia): foto real do jogador e escudo do clube.
ALTER TABLE "Player" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Team" ADD COLUMN "crestUrl" TEXT;
