-- Marca d agua de leitura das notificacoes derivadas.
ALTER TABLE "User" ADD COLUMN "notificationsSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
