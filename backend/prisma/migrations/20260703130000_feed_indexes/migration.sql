-- Índices do feed do Explorar: eventos recentes por tipo e listagens ativas recentes.
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");
