-- CreateEnum
CREATE TYPE "AgentPersona" AS ENUM ('EMMA', 'ELEA');

-- CreateEnum
CREATE TYPE "AgentApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "agent_conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "persona" "AgentPersona" NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_message" (
    "seq" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "item" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_message_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "agent_run" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "persona" "AgentPersona" NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "state" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "traceId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_approval" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "status" "AgentApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "agent_approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_conversation_organizationId_userId_updatedAt_idx" ON "agent_conversation"("organizationId", "userId", "updatedAt");

-- CreateIndex
CREATE INDEX "agent_conversation_userId_persona_updatedAt_idx" ON "agent_conversation"("userId", "persona", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_message_id_key" ON "agent_message"("id");

-- CreateIndex
CREATE INDEX "agent_message_conversationId_seq_idx" ON "agent_message"("conversationId", "seq");

-- CreateIndex
CREATE INDEX "agent_run_conversationId_createdAt_idx" ON "agent_run"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_approval_runId_status_idx" ON "agent_approval"("runId", "status");

-- CreateIndex
CREATE INDEX "agent_approval_organizationId_status_expiresAt_idx" ON "agent_approval"("organizationId", "status", "expiresAt");

-- AddForeignKey
ALTER TABLE "agent_conversation" ADD CONSTRAINT "agent_conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversation" ADD CONSTRAINT "agent_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_message" ADD CONSTRAINT "agent_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "agent_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "agent_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_approval" ADD CONSTRAINT "agent_approval_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_approval" ADD CONSTRAINT "agent_approval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
