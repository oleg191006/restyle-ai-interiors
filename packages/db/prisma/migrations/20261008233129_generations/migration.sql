-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'queued',
    "visitorId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "roomSlug" TEXT NOT NULL,
    "styleSlug" TEXT NOT NULL,
    "inputKey" TEXT NOT NULL,
    "outputKey" TEXT,
    "provider" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Generation_visitorId_createdAt_idx" ON "Generation"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_createdAt_idx" ON "Generation"("createdAt");
