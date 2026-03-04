-- CreateEnum
CREATE TYPE "TemplateScope" AS ENUM ('GLOBAL', 'PARTICIPANT');

-- CreateTable
CREATE TABLE "MedicationTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scope" "TemplateScope" NOT NULL DEFAULT 'GLOBAL',
    "participantId" TEXT,
    "defaultRangePreset" "RangePreset" NOT NULL DEFAULT 'week_plus',
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicationTemplate_templateKey_key" ON "MedicationTemplate"("templateKey");

-- CreateIndex
CREATE INDEX "MedicationTemplate_isActive_scope_idx" ON "MedicationTemplate"("isActive", "scope");

-- CreateIndex
CREATE INDEX "MedicationTemplate_participantId_idx" ON "MedicationTemplate"("participantId");

-- AddForeignKey
ALTER TABLE "MedicationTemplate" ADD CONSTRAINT "MedicationTemplate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
