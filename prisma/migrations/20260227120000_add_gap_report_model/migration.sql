-- CreateTable GapReport
CREATE TABLE "GapReport" (
    "id" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "kpiMetrics" JSONB NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GapReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex GapReport_createdAt_idx
CREATE INDEX "GapReport_createdAt_idx" ON "GapReport"("createdAt");

-- CreateIndex GapReport_from_to_idx
CREATE INDEX "GapReport_from_to_idx" ON "GapReport"("from", "to");

-- CreateIndex GapReport_expiresAt_idx
CREATE INDEX "GapReport_expiresAt_idx" ON "GapReport"("expiresAt");
