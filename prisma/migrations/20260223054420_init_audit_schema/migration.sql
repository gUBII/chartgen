-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "AmountEaten" AS ENUM ('ZERO', 'TWENTY_FIVE', 'FIFTY', 'SEVENTY_FIVE', 'ONE_HUNDRED', 'REFUSED');

-- CreateEnum
CREATE TYPE "SwallowObservation" AS ENUM ('NONE', 'COUGHING', 'GAGGING', 'CHOKING', 'WATERY_EYES', 'MULTIPLE_SWALLOWS', 'THROAT_CLEARING');

-- CreateEnum
CREATE TYPE "MARStatus" AS ENUM ('ADMINISTERED', 'REFUSED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPPORT_WORKER', 'SUPERVISOR', 'CLINICAL_LEAD');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('LIVE', 'RESTORED_APPROVED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CANDIDATE_CREATED', 'CANDIDATE_APPROVED', 'CANDIDATE_REJECTED', 'LEDGER_WRITTEN');

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "externalReference" TEXT,
    "fullName" TEXT NOT NULL,
    "defaultFoodTexture" INTEGER NOT NULL,
    "defaultFluidThickness" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "workerNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestorationBatch" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "requestedByStaffId" TEXT NOT NULL,
    "reviewedByStaffId" TEXT,
    "reason" TEXT NOT NULL,
    "recoveryStart" TIMESTAMP(3) NOT NULL,
    "recoveryEnd" TIMESTAMP(3) NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestorationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestoredMealCandidate" (
    "id" TEXT NOT NULL,
    "restorationBatchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "generatedByStaffId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "foodTexture" INTEGER NOT NULL,
    "fluidThickness" INTEGER NOT NULL,
    "volumeMl" INTEGER NOT NULL,
    "amountEaten" "AmountEaten" NOT NULL,
    "swallowingObservations" "SwallowObservation"[],
    "deviationReason" TEXT,
    "incidentReference" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByStaffId" TEXT,
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "provenanceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestoredMealCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestoredMARCandidate" (
    "id" TEXT NOT NULL,
    "restorationBatchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "generatedByStaffId" TEXT NOT NULL,
    "scheduledAdminTime" TIMESTAMP(3) NOT NULL,
    "actualAdminTime" TIMESTAMP(3) NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" "MARStatus" NOT NULL,
    "omissionReason" TEXT,
    "statusComment" TEXT,
    "statusReview" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByStaffId" TEXT,
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "provenanceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestoredMARCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdByStaffId" TEXT NOT NULL,
    "approvedByStaffId" TEXT,
    "restorationBatchId" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "foodTexture" INTEGER NOT NULL,
    "fluidThickness" INTEGER NOT NULL,
    "volumeMl" INTEGER NOT NULL,
    "amountEaten" "AmountEaten" NOT NULL,
    "swallowingObservations" "SwallowObservation"[],
    "deviationReason" TEXT,
    "incidentReference" TEXT,
    "provenanceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MARLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdByStaffId" TEXT NOT NULL,
    "approvedByStaffId" TEXT,
    "restorationBatchId" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "scheduledAdminTime" TIMESTAMP(3) NOT NULL,
    "actualAdminTime" TIMESTAMP(3) NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" "MARStatus" NOT NULL,
    "omissionReason" TEXT,
    "provenanceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MARLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorStaffId" TEXT NOT NULL,
    "participantId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "previousHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_externalReference_key" ON "Participant"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_workerNumber_key" ON "Staff"("workerNumber");

-- CreateIndex
CREATE INDEX "RestorationBatch_participantId_recoveryStart_recoveryEnd_idx" ON "RestorationBatch"("participantId", "recoveryStart", "recoveryEnd");

-- CreateIndex
CREATE INDEX "RestorationBatch_status_createdAt_idx" ON "RestorationBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RestoredMealCandidate_participantId_timestamp_idx" ON "RestoredMealCandidate"("participantId", "timestamp");

-- CreateIndex
CREATE INDEX "RestoredMealCandidate_status_createdAt_idx" ON "RestoredMealCandidate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RestoredMARCandidate_participantId_scheduledAdminTime_idx" ON "RestoredMARCandidate"("participantId", "scheduledAdminTime");

-- CreateIndex
CREATE INDEX "RestoredMARCandidate_statusReview_createdAt_idx" ON "RestoredMARCandidate"("statusReview", "createdAt");

-- CreateIndex
CREATE INDEX "MealLog_participantId_timestamp_idx" ON "MealLog"("participantId", "timestamp");

-- CreateIndex
CREATE INDEX "MealLog_source_timestamp_idx" ON "MealLog"("source", "timestamp");

-- CreateIndex
CREATE INDEX "MARLog_participantId_scheduledAdminTime_idx" ON "MARLog"("participantId", "scheduledAdminTime");

-- CreateIndex
CREATE INDEX "MARLog_source_status_scheduledAdminTime_idx" ON "MARLog"("source", "status", "scheduledAdminTime");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_participantId_createdAt_idx" ON "AuditEvent"("participantId", "createdAt");

-- AddForeignKey
ALTER TABLE "RestorationBatch" ADD CONSTRAINT "RestorationBatch_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestorationBatch" ADD CONSTRAINT "RestorationBatch_requestedByStaffId_fkey" FOREIGN KEY ("requestedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestorationBatch" ADD CONSTRAINT "RestorationBatch_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMealCandidate" ADD CONSTRAINT "RestoredMealCandidate_restorationBatchId_fkey" FOREIGN KEY ("restorationBatchId") REFERENCES "RestorationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMealCandidate" ADD CONSTRAINT "RestoredMealCandidate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMealCandidate" ADD CONSTRAINT "RestoredMealCandidate_generatedByStaffId_fkey" FOREIGN KEY ("generatedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMealCandidate" ADD CONSTRAINT "RestoredMealCandidate_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMARCandidate" ADD CONSTRAINT "RestoredMARCandidate_restorationBatchId_fkey" FOREIGN KEY ("restorationBatchId") REFERENCES "RestorationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMARCandidate" ADD CONSTRAINT "RestoredMARCandidate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMARCandidate" ADD CONSTRAINT "RestoredMARCandidate_generatedByStaffId_fkey" FOREIGN KEY ("generatedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoredMARCandidate" ADD CONSTRAINT "RestoredMARCandidate_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_approvedByStaffId_fkey" FOREIGN KEY ("approvedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_restorationBatchId_fkey" FOREIGN KEY ("restorationBatchId") REFERENCES "RestorationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARLog" ADD CONSTRAINT "MARLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARLog" ADD CONSTRAINT "MARLog_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARLog" ADD CONSTRAINT "MARLog_approvedByStaffId_fkey" FOREIGN KEY ("approvedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARLog" ADD CONSTRAINT "MARLog_restorationBatchId_fkey" FOREIGN KEY ("restorationBatchId") REFERENCES "RestorationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
