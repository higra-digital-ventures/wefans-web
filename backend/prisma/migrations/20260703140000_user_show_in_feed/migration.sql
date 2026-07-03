-- Opt-out do feed publico do Explorar (privacidade).
ALTER TABLE "User" ADD COLUMN "showInFeed" BOOLEAN NOT NULL DEFAULT true;
