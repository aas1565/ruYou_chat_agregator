-- Additive state for the only supported automatic conversation closure flow.
CREATE TABLE "ConversationClosureState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "lastAiMessageAt" DATETIME,
    "promptSentAt" DATETIME,
    "promptMessageId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConversationClosureState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConversationClosureState_conversationId_key" ON "ConversationClosureState"("conversationId");
CREATE INDEX "ConversationClosureState_status_promptSentAt_idx" ON "ConversationClosureState"("status", "promptSentAt");

-- Existing rows predate the persisted confirmation state and cannot prove a valid
-- closure flow. Keep them active; future CLOSED/PENDING rows require state above.
UPDATE "Conversation" SET "status" = 'OPEN' WHERE "status" IN ('CLOSED', 'PENDING');
