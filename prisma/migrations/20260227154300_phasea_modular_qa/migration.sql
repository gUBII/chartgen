-- CreateEnum
CREATE TYPE "SleepStatus" AS ENUM ('ASLEEP', 'AWAKE', 'AGITATED');

-- CreateEnum
CREATE TYPE "BowelFluidType" AS ENUM ('BOWEL', 'FLUID_IN', 'FLUID_OUT');

-- CreateEnum
CREATE TYPE "ShiftNoteCategory" AS ENUM ('ROUTINE', 'ESCALATION', 'INCIDENT_FOLLOWUP', 'CLINICAL_HANDOVER');

-- CreateEnum
CREATE TYPE "RestrictivePracticeType" AS ENUM ('CHEMICAL', 'PHYSICAL', 'MECHANICAL', 'ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('SYNTHETIC_QA', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "QaSeverity" AS ENUM ('NONE', 'INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FastingStatus" AS ENUM ('FASTING', 'NON_FASTING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "QaSleepStatus" AS ENUM ('ASLEEP', 'AWAKE', 'AGITATED', 'OUT_OF_BED');

-- CreateEnum
CREATE TYPE "SleepIntervention" AS ENUM ('NONE', 'VERBAL_PROMPT', 'REDIRECTION', 'CPAP_CHECK', 'CONTINENCE_AID_CHANGE', 'COMFORT_MEASURES', 'OTHER');

-- CreateEnum
CREATE TYPE "BristolScale" AS ENUM ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7');

-- CreateEnum
CREATE TYPE "StoolSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'REFUSED', 'NOT_APPLICABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CommunityPurpose" AS ENUM ('SOCIAL', 'MEDICAL', 'CAPACITY_BUILDING', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportMethod" AS ENUM ('WALK', 'PUBLIC_TRANSPORT', 'TAXI_RIDESHARE', 'PROVIDER_VEHICLE', 'PRIVATE_VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "RepositionPosition" AS ENUM ('LEFT_SIDE', 'RIGHT_SIDE', 'SUPINE', 'PRONE', 'SEATED', 'TILT_IN_SPACE', 'OTHER');

-- CreateEnum
CREATE TYPE "SkinCheckOutcome" AS ENUM ('INTACT', 'REDNESS', 'BREAKDOWN', 'PAIN', 'REQUIRES_ESCALATION', 'UNKNOWN', 'OTHER');

-- AlterEnum
ALTER TYPE "EntrySource" ADD VALUE 'SYNTHETIC_QA';

-- CreateTable
CREATE TABLE "SleepSettlingLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "loggedByStaffId" TEXT NOT NULL,
    "checkTime" TIMESTAMP(3) NOT NULL,
    "status" "SleepStatus",
    "intervention" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleepSettlingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviourSupportPlan" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL,
    "activeTo" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvedBy" TEXT,
    "notes" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehaviourSupportPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictivePracticeEvent" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "loggedByStaffId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" "RestrictivePracticeType" NOT NULL,
    "reason" TEXT NOT NULL,
    "durationMin" INTEGER,
    "bspVersionId" TEXT,
    "incidentId" TEXT,
    "relatedMarLogId" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestrictivePracticeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BowelFluidLog" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "loggedByStaffId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" "BowelFluidType" NOT NULL,
    "volumeMl" INTEGER,
    "bristolScale" INTEGER,
    "notes" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BowelFluidLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftNote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "authoredByStaffId" TEXT NOT NULL,
    "category" "ShiftNoteCategory" NOT NULL,
    "note" TEXT NOT NULL,
    "linkedPersonalCareLogId" TEXT,
    "linkedIncidentId" TEXT,
    "linkedBglLogId" TEXT,
    "linkedBowelFluidLogId" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BglDiabetesLog" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'SYNTHETIC_QA',
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "bglReadingMmolL" DOUBLE PRECISION,
    "fastingStatus" "FastingStatus" NOT NULL DEFAULT 'UNKNOWN',
    "insulinAdministered" BOOLEAN NOT NULL DEFAULT false,
    "insulinMarRefId" TEXT,
    "actionTaken" TEXT,
    "qaSeverity" "QaSeverity" NOT NULL DEFAULT 'NONE',
    "qaAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "qaMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BglDiabetesLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepSettlingQaLog" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'SYNTHETIC_QA',
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "status" "QaSleepStatus" NOT NULL,
    "intervention" "SleepIntervention" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "qaSeverity" "QaSeverity" NOT NULL DEFAULT 'NONE',
    "qaAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "qaMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SleepSettlingQaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BowelFluidQaLog" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'SYNTHETIC_QA',
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "hadBowelMotion" BOOLEAN NOT NULL DEFAULT false,
    "bristolScale" "BristolScale",
    "stoolSize" "StoolSize",
    "fluidIntakeDeltaMl" INTEGER NOT NULL DEFAULT 0,
    "fluidOutputDeltaMl" INTEGER NOT NULL DEFAULT 0,
    "cumulativeIntakeMl" INTEGER NOT NULL DEFAULT 0,
    "cumulativeOutputMl" INTEGER NOT NULL DEFAULT 0,
    "netBalanceMl" INTEGER NOT NULL DEFAULT 0,
    "qaSeverity" "QaSeverity" NOT NULL DEFAULT 'NONE',
    "qaAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "qaMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BowelFluidQaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HygieneLog" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'SYNTHETIC_QA',
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "showerStatus" "CompletionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "oralCareStatus" "CompletionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "groomingStatus" "CompletionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "continenceCareStatus" "CompletionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "skinIntegrityChecked" "CompletionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "refusalReason" TEXT,
    "alternativeMethod" TEXT,
    "notes" TEXT,
    "qaSeverity" "QaSeverity" NOT NULL DEFAULT 'NONE',
    "qaAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "qaMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HygieneLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityAccessQaLog" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'SYNTHETIC_QA',
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "departedAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "destination" TEXT NOT NULL,
    "purpose" "CommunityPurpose" NOT NULL,
    "transportMethod" "TransportMethod" NOT NULL,
    "odometerStart" INTEGER,
    "odometerEnd" INTEGER,
    "notes" TEXT,
    "qaSeverity" "QaSeverity" NOT NULL DEFAULT 'NONE',
    "qaAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "qaMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityAccessQaLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositioningQaLog" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'SYNTHETIC_QA',
    "participantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "turnedAt" TIMESTAMP(3) NOT NULL,
    "position" "RepositionPosition" NOT NULL,
    "skinCheckOutcome" "SkinCheckOutcome" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "planIntervalMin" INTEGER,
    "qaSeverity" "QaSeverity" NOT NULL DEFAULT 'NONE',
    "qaAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "qaMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositioningQaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SleepSettlingLog_participantId_checkTime_idx" ON "SleepSettlingLog"("participantId", "checkTime");

-- CreateIndex
CREATE INDEX "SleepSettlingLog_loggedByStaffId_checkTime_idx" ON "SleepSettlingLog"("loggedByStaffId", "checkTime");

-- CreateIndex
CREATE INDEX "SleepSettlingLog_source_idx" ON "SleepSettlingLog"("source");

-- CreateIndex
CREATE INDEX "BehaviourSupportPlan_participantId_activeFrom_activeTo_idx" ON "BehaviourSupportPlan"("participantId", "activeFrom", "activeTo");

-- CreateIndex
CREATE INDEX "BehaviourSupportPlan_createdAt_idx" ON "BehaviourSupportPlan"("createdAt");

-- CreateIndex
CREATE INDEX "RestrictivePracticeEvent_participantId_timestamp_idx" ON "RestrictivePracticeEvent"("participantId", "timestamp");

-- CreateIndex
CREATE INDEX "RestrictivePracticeEvent_bspVersionId_idx" ON "RestrictivePracticeEvent"("bspVersionId");

-- CreateIndex
CREATE INDEX "RestrictivePracticeEvent_timestamp_idx" ON "RestrictivePracticeEvent"("timestamp");

-- CreateIndex
CREATE INDEX "RestrictivePracticeEvent_source_idx" ON "RestrictivePracticeEvent"("source");

-- CreateIndex
CREATE INDEX "BowelFluidLog_participantId_timestamp_idx" ON "BowelFluidLog"("participantId", "timestamp");

-- CreateIndex
CREATE INDEX "BowelFluidLog_type_timestamp_idx" ON "BowelFluidLog"("type", "timestamp");

-- CreateIndex
CREATE INDEX "BowelFluidLog_source_idx" ON "BowelFluidLog"("source");

-- CreateIndex
CREATE INDEX "ShiftNote_participantId_createdAt_idx" ON "ShiftNote"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "ShiftNote_category_createdAt_idx" ON "ShiftNote"("category", "createdAt");

-- CreateIndex
CREATE INDEX "ShiftNote_source_idx" ON "ShiftNote"("source");

-- CreateIndex
CREATE INDEX "BglDiabetesLog_participantId_loggedAt_idx" ON "BglDiabetesLog"("participantId", "loggedAt");

-- CreateIndex
CREATE INDEX "BglDiabetesLog_staffId_loggedAt_idx" ON "BglDiabetesLog"("staffId", "loggedAt");

-- CreateIndex
CREATE INDEX "BglDiabetesLog_localDate_idx" ON "BglDiabetesLog"("localDate");

-- CreateIndex
CREATE INDEX "BglDiabetesLog_source_idx" ON "BglDiabetesLog"("source");

-- CreateIndex
CREATE INDEX "SleepSettlingQaLog_participantId_checkedAt_idx" ON "SleepSettlingQaLog"("participantId", "checkedAt");

-- CreateIndex
CREATE INDEX "SleepSettlingQaLog_staffId_checkedAt_idx" ON "SleepSettlingQaLog"("staffId", "checkedAt");

-- CreateIndex
CREATE INDEX "SleepSettlingQaLog_localDate_idx" ON "SleepSettlingQaLog"("localDate");

-- CreateIndex
CREATE INDEX "SleepSettlingQaLog_source_idx" ON "SleepSettlingQaLog"("source");

-- CreateIndex
CREATE INDEX "BowelFluidQaLog_participantId_loggedAt_idx" ON "BowelFluidQaLog"("participantId", "loggedAt");

-- CreateIndex
CREATE INDEX "BowelFluidQaLog_staffId_loggedAt_idx" ON "BowelFluidQaLog"("staffId", "loggedAt");

-- CreateIndex
CREATE INDEX "BowelFluidQaLog_localDate_idx" ON "BowelFluidQaLog"("localDate");

-- CreateIndex
CREATE INDEX "BowelFluidQaLog_source_idx" ON "BowelFluidQaLog"("source");

-- CreateIndex
CREATE INDEX "HygieneLog_participantId_loggedAt_idx" ON "HygieneLog"("participantId", "loggedAt");

-- CreateIndex
CREATE INDEX "HygieneLog_staffId_loggedAt_idx" ON "HygieneLog"("staffId", "loggedAt");

-- CreateIndex
CREATE INDEX "HygieneLog_localDate_idx" ON "HygieneLog"("localDate");

-- CreateIndex
CREATE INDEX "HygieneLog_source_idx" ON "HygieneLog"("source");

-- CreateIndex
CREATE INDEX "CommunityAccessQaLog_participantId_departedAt_idx" ON "CommunityAccessQaLog"("participantId", "departedAt");

-- CreateIndex
CREATE INDEX "CommunityAccessQaLog_staffId_departedAt_idx" ON "CommunityAccessQaLog"("staffId", "departedAt");

-- CreateIndex
CREATE INDEX "CommunityAccessQaLog_localDate_idx" ON "CommunityAccessQaLog"("localDate");

-- CreateIndex
CREATE INDEX "CommunityAccessQaLog_source_idx" ON "CommunityAccessQaLog"("source");

-- CreateIndex
CREATE INDEX "RepositioningQaLog_participantId_turnedAt_idx" ON "RepositioningQaLog"("participantId", "turnedAt");

-- CreateIndex
CREATE INDEX "RepositioningQaLog_staffId_turnedAt_idx" ON "RepositioningQaLog"("staffId", "turnedAt");

-- CreateIndex
CREATE INDEX "RepositioningQaLog_localDate_idx" ON "RepositioningQaLog"("localDate");

-- CreateIndex
CREATE INDEX "RepositioningQaLog_source_idx" ON "RepositioningQaLog"("source");

-- AddForeignKey
ALTER TABLE "SleepSettlingLog" ADD CONSTRAINT "SleepSettlingLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepSettlingLog" ADD CONSTRAINT "SleepSettlingLog_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviourSupportPlan" ADD CONSTRAINT "BehaviourSupportPlan_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestrictivePracticeEvent" ADD CONSTRAINT "RestrictivePracticeEvent_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestrictivePracticeEvent" ADD CONSTRAINT "RestrictivePracticeEvent_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestrictivePracticeEvent" ADD CONSTRAINT "RestrictivePracticeEvent_bspVersionId_fkey" FOREIGN KEY ("bspVersionId") REFERENCES "BehaviourSupportPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BowelFluidLog" ADD CONSTRAINT "BowelFluidLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BowelFluidLog" ADD CONSTRAINT "BowelFluidLog_loggedByStaffId_fkey" FOREIGN KEY ("loggedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_authoredByStaffId_fkey" FOREIGN KEY ("authoredByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BglDiabetesLog" ADD CONSTRAINT "BglDiabetesLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BglDiabetesLog" ADD CONSTRAINT "BglDiabetesLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepSettlingQaLog" ADD CONSTRAINT "SleepSettlingQaLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepSettlingQaLog" ADD CONSTRAINT "SleepSettlingQaLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BowelFluidQaLog" ADD CONSTRAINT "BowelFluidQaLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BowelFluidQaLog" ADD CONSTRAINT "BowelFluidQaLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HygieneLog" ADD CONSTRAINT "HygieneLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HygieneLog" ADD CONSTRAINT "HygieneLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAccessQaLog" ADD CONSTRAINT "CommunityAccessQaLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAccessQaLog" ADD CONSTRAINT "CommunityAccessQaLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositioningQaLog" ADD CONSTRAINT "RepositioningQaLog_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositioningQaLog" ADD CONSTRAINT "RepositioningQaLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
