-- Reações do feed (🔥): um usuário reage uma vez por evento derivado (eventKey).
CREATE TABLE "FeedReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedReaction_userId_eventKey_key" ON "FeedReaction"("userId", "eventKey");
CREATE INDEX "FeedReaction_eventKey_idx" ON "FeedReaction"("eventKey");

ALTER TABLE "FeedReaction" ADD CONSTRAINT "FeedReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
