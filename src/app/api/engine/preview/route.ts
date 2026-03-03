import { createHash } from "node:crypto";
import { MealType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapPrismaApiError } from "../../../../lib/prisma-api-errors";
import { findMissingTables } from "../../../../lib/schema-readiness";
import { RestorationEngine } from "../../../../services/restoration/restorationEngine";
import { deriveParticipantBaselines } from "../../../../services/restoration/personalizationEngine";

export const runtime = "nodejs";

const MAX_PREVIEW_DAYS = 365;
const MAX_MEDICATION_TEMPLATES = 24;
const TIME_24H_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PREVIEW_REQUIRED_TABLES = [
  "Staff",
  "Participant",
  "RestorationBatch",
  "RestoredMealCandidate",
  "RestoredMARCandidate",
] as const;

const PREVIEW_PATCH_REQUIRED_TABLES = [
  "Staff",
  "RestorationBatch",
  "RestoredMealCandidate",
] as const;

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const PREVIEW_TX_MAX_WAIT_MS = parsePositiveInt(process.env.PREVIEW_TX_MAX_WAIT_MS, 30_000);
const PREVIEW_TX_TIMEOUT_MS = parsePositiveInt(process.env.PREVIEW_TX_TIMEOUT_MS, 300_000);

type MedicationTemplate = {
  name: string;
  dosage: string;
  route: string;
  hour: number;
  minute: number;
};

type PreviewRequestBody = {
  participantId?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  generatedByStaffId?: string;
  defaultWorkerStaffId?: string;
  workerScheduleByDow?: Record<string, string>;
  seed?: number;
  profile?: "balanced" | "strict";
  medications?: Array<{
    name?: string;
    dosage?: string;
    route?: string;
    hour?: number;
    minute?: number;
  }>;
};

type MealTemplate = {
  mealType: MealType;
  hour: number;
  minute: number;
  targetVolumeMl: number;
};

type TimeParts = {
  hour: number;
  minute: number;
};

class PreviewApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_MEAL_TEMPLATES: MealTemplate[] = [
  { mealType: MealType.BREAKFAST, hour: 8, minute: 0, targetVolumeMl: 260 },
  { mealType: MealType.LUNCH, hour: 12, minute: 30, targetVolumeMl: 360 },
  { mealType: MealType.SNACK, hour: 15, minute: 30, targetVolumeMl: 180 },
  { mealType: MealType.DINNER, hour: 18, minute: 0, targetVolumeMl: 420 },
];

const DEFAULT_MEDICATION_TEMPLATES: MedicationTemplate[] = [
  { name: "Paracetamol", dosage: "500mg", route: "Oral", hour: 8, minute: 0 },
  { name: "Metformin", dosage: "500mg", route: "Oral", hour: 12, minute: 30 },
  { name: "Omeprazole", dosage: "20mg", route: "Oral", hour: 7, minute: 30 },
  { name: "Docusate Sodium", dosage: "100mg", route: "Oral", hour: 20, minute: 0 },
];

const ALLOWED_AMOUNT_EATEN = new Set([
  "ZERO",
  "TWENTY_FIVE",
  "FIFTY",
  "SEVENTY_FIVE",
  "ONE_HUNDRED",
  "REFUSED",
]);

const sha256 = (payload: unknown): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const toIso = (value: unknown): string => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new PreviewApiError(422, "INVALID_DATE", `Invalid date value received: ${String(value)}`);
  }
  return date.toISOString();
};

const computeMealCandidateHash = (candidate: {
  participantId: string;
  timestamp: Date;
  mealType: string;
  foodTexture: number;
  fluidThickness: number;
  volumeMl: number;
  amountEaten: string;
  swallowingObservations: string[];
  deviationReason?: string | null;
  restorationBatchId: string;
  generatedByStaffId: string;
  createdAt: Date;
}): string => {
  return sha256({
    participantId: candidate.participantId,
    timestamp: toIso(candidate.timestamp),
    mealType: candidate.mealType,
    foodTexture: candidate.foodTexture,
    fluidThickness: candidate.fluidThickness,
    volumeMl: candidate.volumeMl,
    amountEaten: candidate.amountEaten,
    swallowingObservations: candidate.swallowingObservations,
    deviationReason: candidate.deviationReason ?? null,
    restorationBatchId: candidate.restorationBatchId,
    generatedByStaffId: candidate.generatedByStaffId,
    generatedAt: toIso(candidate.createdAt),
  });
};

const computeMarCandidateHash = (candidate: {
  participantId: string;
  scheduledAdminTime: Date;
  actualAdminTime: Date;
  medicationName: string;
  dosage: string;
  route: string;
  status: string;
  omissionReason: string | null;
  statusComment: string | null;
  restorationBatchId: string;
  generatedByStaffId: string;
  createdAt: Date;
}): string => {
  return sha256({
    participantId: candidate.participantId,
    scheduledAdminTime: toIso(candidate.scheduledAdminTime),
    actualAdminTime: toIso(candidate.actualAdminTime),
    medicationName: candidate.medicationName,
    dosage: candidate.dosage,
    route: candidate.route,
    status: candidate.status,
    omissionReason: candidate.omissionReason ?? null,
    statusComment: candidate.statusComment ?? null,
    restorationBatchId: candidate.restorationBatchId,
    generatedByStaffId: candidate.generatedByStaffId,
    generatedAt: toIso(candidate.createdAt),
  });
};

const parseRequiredDate = (value: string | undefined, fieldName: string): Date => {
  if (!value || !value.trim()) {
    throw new PreviewApiError(400, "MISSING_FIELD", `${fieldName} is required.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PreviewApiError(400, "INVALID_DATE", `${fieldName} must be a valid date.`);
  }

  return parsed;
};

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const withTime = (
  date: Date,
  hour: number,
  minute: number,
  second = 0,
  millisecond = 0
): Date => {
  const copy = new Date(date);
  copy.setHours(hour, minute, second, millisecond);
  return copy;
};

const parseTimeOrDefault = (
  value: string | undefined,
  fieldName: string,
  fallback: TimeParts
): TimeParts => {
  if (!value || !value.trim()) {
    return fallback;
  }

  const trimmed = value.trim();
  const match = trimmed.match(TIME_24H_PATTERN);
  if (!match) {
    throw new PreviewApiError(400, "INVALID_TIME", `${fieldName} must use HH:mm 24-hour format.`);
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
};

const isWithinWindow = (value: Date, start: Date, end: Date): boolean => {
  const t = value.getTime();
  return t >= start.getTime() && t <= end.getTime();
};

const RECORD_TIME_KEYS = [
  "timestamp",
  "loggedAt",
  "checkedAt",
  "scheduledAdminTime",
  "actualAdminTime",
  "turnedAt",
  "departedAt",
  "returnedAt",
  "startedAt",
] as const;

const extractRecordDate = (record: Record<string, unknown>): Date | null => {
  for (const key of RECORD_TIME_KEYS) {
    const raw = record[key];
    if (raw === undefined || raw === null) {
      continue;
    }
    const parsed = new Date(String(raw));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
};

const differenceInDaysInclusive = (start: Date, end: Date): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
};

const dayIterator = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const makeScheduledTime = (baseDay: Date, hour: number, minute: number): Date => {
  const scheduled = new Date(baseDay);
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled;
};

const parseWorkerSchedule = (value: unknown): Record<number, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<number, string> = {};
  for (const [rawDow, rawStaffId] of Object.entries(value as Record<string, unknown>)) {
    const dow = Number(rawDow);
    const staffId = String(rawStaffId ?? "").trim();
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      throw new PreviewApiError(400, "INVALID_WORKER_SCHEDULE", `Invalid day key in workerScheduleByDow: ${rawDow}`);
    }
    if (!staffId) {
      continue;
    }
    result[dow] = staffId;
  }

  return result;
};

export async function POST(request: NextRequest) {
  try {
    const missingTables = await findMissingTables(prisma, [...PREVIEW_REQUIRED_TABLES]);
    if (missingTables.length > 0) {
      throw new PreviewApiError(
        503,
        "SCHEMA_NOT_READY",
        "Database schema is missing required tables for preview generation.",
        { missingTables }
      );
    }

    let body: PreviewRequestBody;
    try {
      body = (await request.json()) as PreviewRequestBody;
    } catch {
      throw new PreviewApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const participantId = body.participantId?.trim();
    if (!participantId) {
      throw new PreviewApiError(400, "MISSING_FIELD", "participantId is required.");
    }

    const startDate = parseRequiredDate(body.startDate, "startDate");
    const endDate = parseRequiredDate(body.endDate, "endDate");
    const startTime = parseTimeOrDefault(body.startTime, "startTime", { hour: 0, minute: 0 });
    const endTime = parseTimeOrDefault(body.endTime, "endTime", { hour: 23, minute: 59 });

    const recoveryStart = withTime(startDate, startTime.hour, startTime.minute, 0, 0);
    const recoveryEnd = withTime(endDate, endTime.hour, endTime.minute, 59, 999);
    if (recoveryEnd.getTime() < recoveryStart.getTime()) {
      throw new PreviewApiError(400, "INVALID_RANGE", "endDate must be on or after startDate.");
    }

    const rangeStart = startOfDay(startDate);
    const rangeEnd = endOfDay(endDate);
    const requestedDays = differenceInDaysInclusive(rangeStart, rangeEnd);
    if (requestedDays > MAX_PREVIEW_DAYS) {
      throw new PreviewApiError(
        400,
        "RANGE_TOO_LARGE",
        `Date range is too large. Max supported preview is ${MAX_PREVIEW_DAYS} days.`
      );
    }

    const workerScheduleByDow = parseWorkerSchedule(body.workerScheduleByDow);
    const requestedByStaffIdInput = body.generatedByStaffId?.trim() ?? "";
    const defaultWorkerStaffIdInput = body.defaultWorkerStaffId?.trim() ?? "";

    const referencedIds = new Set<string>();
    if (requestedByStaffIdInput) referencedIds.add(requestedByStaffIdInput);
    if (defaultWorkerStaffIdInput) referencedIds.add(defaultWorkerStaffIdInput);
    for (const workerId of Object.values(workerScheduleByDow)) {
      if (workerId) referencedIds.add(workerId);
    }

    const referencedStaffRows = referencedIds.size
      ? await prisma.staff.findMany({
          where: { id: { in: [...referencedIds] } },
          select: { id: true, role: true },
        })
      : [];
    const staffById = new Map(referencedStaffRows.map((row) => [row.id, row]));

    const missingReferencedIds = [...referencedIds].filter((id) => !staffById.has(id));
    if (missingReferencedIds.length > 0) {
      throw new PreviewApiError(
        400,
        "INVALID_STAFF_ID",
        "One or more selected workers/staff could not be found.",
        { missingStaffIds: missingReferencedIds }
      );
    }

    const fallbackStaff = await prisma.staff.findFirst({
      where: { role: { in: ["SUPPORT_WORKER", "SUPERVISOR", "CLINICAL_LEAD"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true },
    });

    if (!fallbackStaff) {
      throw new PreviewApiError(
        409,
        "STAFF_REQUIRED",
        "No staff record is available. Create a Staff row before generating preview batches."
      );
    }

    const defaultWorkerStaffId = defaultWorkerStaffIdInput || requestedByStaffIdInput || fallbackStaff.id;
    const requestedByStaffId = requestedByStaffIdInput || defaultWorkerStaffId;

    const resolveWorkerForDay = (day: Date): string => {
      const dow = day.getDay();
      const mappedWorker = workerScheduleByDow[dow];
      if (mappedWorker) {
        return mappedWorker;
      }
      return defaultWorkerStaffId;
    };

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        defaultFoodTexture: true,
        defaultFluidThickness: true,
      },
    });

    if (!participant) {
      throw new PreviewApiError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
    }

    // Resolve medication templates: use body override or defaults
    const medicationTemplates: MedicationTemplate[] =
      body.medications && body.medications.length > 0
        ? body.medications.map((m, i) => ({
            name: m.name?.trim() || `Medication ${i + 1}`,
            dosage: m.dosage?.trim() || "",
            route: m.route?.trim() || "Oral",
            hour: m.hour ?? 8,
            minute: m.minute ?? 0,
          }))
        : DEFAULT_MEDICATION_TEMPLATES;
    if (medicationTemplates.length > MAX_MEDICATION_TEMPLATES) {
      throw new PreviewApiError(
        400,
        "TOO_MANY_MEDICATIONS",
        `Maximum ${MAX_MEDICATION_TEMPLATES} medications are supported per day.`
      );
    }
    for (let i = 0; i < medicationTemplates.length; i++) {
      const template = medicationTemplates[i];
      if (template.hour < 0 || template.hour > 23 || template.minute < 0 || template.minute > 59) {
        throw new PreviewApiError(
          400,
          "INVALID_TIME",
          `Medication ${i + 1} has invalid time (hour: ${template.hour}, minute: ${template.minute}).`
        );
      }
    }

    const engine = new RestorationEngine();
    const days = dayIterator(rangeStart, rangeEnd);
    const baselines = await deriveParticipantBaselines(participant.id);

    // Phase 1: Transaction for Meal + MAR candidates
    const txResult = await prisma.$transaction(async (tx) => {
      const batch = await tx.restorationBatch.create({
        data: {
          participantId: participant.id,
          requestedByStaffId,
          reason: `Preview generation ${recoveryStart.toISOString()} -> ${recoveryEnd.toISOString()}`,
          recoveryStart,
          recoveryEnd,
          status: "PENDING",
        },
        select: { id: true, participantId: true },
      });

      const mealRows: Record<string, unknown>[] = [];
      const marRows: Record<string, unknown>[] = [];

      // Meal candidates
      for (const day of days) {
        const dayWorkerStaffId = resolveWorkerForDay(day);
        for (const template of DEFAULT_MEAL_TEMPLATES) {
          const scheduledTime = makeScheduledTime(day, template.hour, template.minute);
          if (!isWithinWindow(scheduledTime, recoveryStart, recoveryEnd)) {
            continue;
          }

          const generatedAt = new Date();
          const generated = engine.restoreMealCandidate(
            {
              participantId: participant.id,
              defaultFoodTexture: participant.defaultFoodTexture,
              defaultFluidThickness: participant.defaultFluidThickness,
              personalizationBaselines: baselines,
            },
            {
              scheduledTime,
              mealType: template.mealType,
              targetVolumeMl: template.targetVolumeMl,
            },
            {
              restorationBatchId: batch.id,
              generatedByStaffId: dayWorkerStaffId,
              generatedAt,
            }
          );

          const provenanceHash = computeMealCandidateHash({
            participantId: generated.participantId,
            timestamp: generated.timestamp,
            mealType: generated.mealType,
            foodTexture: generated.foodTexture,
            fluidThickness: generated.fluidThickness,
            volumeMl: generated.volumeMl,
            amountEaten: generated.amountEaten,
            swallowingObservations: generated.swallowingObservations,
            deviationReason: generated.deviationReason,
            restorationBatchId: batch.id,
            generatedByStaffId: dayWorkerStaffId,
            createdAt: generatedAt,
          });

          const persisted = await tx.restoredMealCandidate.create({
            data: {
              restorationBatchId: batch.id,
              participantId: generated.participantId,
              generatedByStaffId: dayWorkerStaffId,
              timestamp: generated.timestamp,
              mealType: generated.mealType,
              foodTexture: generated.foodTexture,
              fluidThickness: generated.fluidThickness,
              volumeMl: generated.volumeMl,
              amountEaten: generated.amountEaten,
              swallowingObservations: generated.swallowingObservations,
              deviationReason: generated.deviationReason,
              status: "PENDING",
              provenanceHash,
              createdAt: generatedAt,
              updatedAt: generatedAt,
            },
            select: {
              id: true,
              generatedByStaffId: true,
              timestamp: true,
              mealType: true,
              foodTexture: true,
              fluidThickness: true,
              volumeMl: true,
              amountEaten: true,
              deviationReason: true,
              status: true,
              provenanceHash: true,
            },
          });

          mealRows.push(persisted);
        }

        // MAR candidates for this day
        for (const medTemplate of medicationTemplates) {
          const scheduledAdminTime = makeScheduledTime(day, medTemplate.hour, medTemplate.minute);
          if (!isWithinWindow(scheduledAdminTime, recoveryStart, recoveryEnd)) {
            continue;
          }

          const generatedAt = new Date();
          const generated = engine.restoreMedicationCandidate(
            {
              participantId: participant.id,
              defaultFoodTexture: participant.defaultFoodTexture,
              defaultFluidThickness: participant.defaultFluidThickness,
              personalizationBaselines: baselines,
            },
            {
              scheduledAdminTime,
              medicationName: medTemplate.name,
              dosage: medTemplate.dosage,
              route: medTemplate.route,
            },
            {
              restorationBatchId: batch.id,
              generatedByStaffId: dayWorkerStaffId,
              generatedAt,
            }
          );

          const provenanceHash = computeMarCandidateHash({
            participantId: generated.participantId,
            scheduledAdminTime: generated.scheduledAdminTime,
            actualAdminTime: generated.actualAdminTime,
            medicationName: generated.medicationName,
            dosage: generated.dosage,
            route: generated.route,
            status: generated.status,
            omissionReason: generated.omissionReason,
            statusComment: generated.statusComment,
            restorationBatchId: batch.id,
            generatedByStaffId: dayWorkerStaffId,
            createdAt: generatedAt,
          });

          const persisted = await tx.restoredMARCandidate.create({
            data: {
              restorationBatchId: batch.id,
              participantId: generated.participantId,
              generatedByStaffId: dayWorkerStaffId,
              scheduledAdminTime: generated.scheduledAdminTime,
              actualAdminTime: generated.actualAdminTime,
              medicationName: generated.medicationName,
              dosage: generated.dosage,
              route: generated.route,
              status: generated.status,
              omissionReason: generated.omissionReason,
              statusComment: generated.statusComment,
              statusReview: "PENDING",
              provenanceHash,
              createdAt: generatedAt,
              updatedAt: generatedAt,
            },
            select: {
              id: true,
              generatedByStaffId: true,
              scheduledAdminTime: true,
              actualAdminTime: true,
              medicationName: true,
              dosage: true,
              route: true,
              status: true,
              omissionReason: true,
              statusComment: true,
              statusReview: true,
              provenanceHash: true,
            },
          });

          marRows.push(persisted);
        }
      }

      return {
        batchId: batch.id,
        participantId: batch.participantId,
        generatedByStaffId: requestedByStaffId,
        mealRows,
        marRows,
      };
    }, { maxWait: PREVIEW_TX_MAX_WAIT_MS, timeout: PREVIEW_TX_TIMEOUT_MS });

    // Phase 2: Sleep/BGL/Bowel via generateBatch (runs its own transaction)
    const moduleLogs: Record<string, unknown>[] = [];
    for (const day of days) {
      const dayWorkerStaffId = resolveWorkerForDay(day);
      const dayRecords = await engine.generateBatch(
        {
          date: day,
          participantId: participant.id,
          staffId: dayWorkerStaffId,
          planConfig: {},
        },
        { seed: body.seed }
      );
      const filteredDayRecords = dayRecords.filter((record) => {
        if (!record || typeof record !== "object") {
          return true;
        }
        const recordDate = extractRecordDate(record as Record<string, unknown>);
        return recordDate ? isWithinWindow(recordDate, recoveryStart, recoveryEnd) : true;
      });
      moduleLogs.push(...filteredDayRecords);
    }

    const sleepLogs = moduleLogs.filter((r) => "checkedAt" in r);
    const bglLogs = moduleLogs.filter((r) => "bglReadingMmolL" in r);
    const bowelLogs = moduleLogs.filter((r) => "hadBowelMotion" in r);
    const hygieneLogs = moduleLogs.filter((r) => "showerStatus" in r && "oralCareStatus" in r);
    const communityLogs = moduleLogs.filter((r) => "departedAt" in r && "destination" in r);
    const repositionLogs = moduleLogs.filter((r) => "turnedAt" in r && "position" in r);

    const result = {
      batchId: txResult.batchId,
      participantId: txResult.participantId,
      generatedByStaffId: txResult.generatedByStaffId,
      defaultWorkerStaffId,
      workerScheduleByDow,
      candidates: txResult.mealRows,
      marLogs: txResult.marRows,
      sleepLogs,
      bglLogs,
      bowelLogs,
      hygieneLogs,
      communityLogs,
      repositionLogs,
      candidateCount: txResult.mealRows.length,
      marCandidateCount: txResult.marRows.length,
      moduleCounts: {
        sleep: sleepLogs.length,
        bgl: bglLogs.length,
        bowel: bowelLogs.length,
        hygiene: hygieneLogs.length,
        community: communityLogs.length,
        reposition: repositionLogs.length,
      },
    };

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof PreviewApiError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details ?? null,
          },
        },
        { status: error.status }
      );
    }

    const prismaError = mapPrismaApiError(error);
    if (prismaError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: prismaError.code,
            message: prismaError.message,
            details: prismaError.details ?? null,
          },
        },
        { status: prismaError.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error during preview generation.",
        },
      },
      { status: 500 }
    );
  }
}

type PatchRequestBody = {
  candidateId?: string;
  batchId?: string;
  approveAll?: boolean;
  actorStaffId?: string;
  amountEaten?: string;
  timestamp?: string;
};

export async function PATCH(request: NextRequest) {
  try {
    const missingTables = await findMissingTables(prisma, [...PREVIEW_PATCH_REQUIRED_TABLES]);
    if (missingTables.length > 0) {
      throw new PreviewApiError(
        503,
        "SCHEMA_NOT_READY",
        "Database schema is missing required tables for preview updates.",
        { missingTables }
      );
    }

    let body: PatchRequestBody;
    try {
      body = (await request.json()) as PatchRequestBody;
    } catch {
      throw new PreviewApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    if (body.approveAll === true) {
      const batchId = body.batchId?.trim();
      if (!batchId) {
        throw new PreviewApiError(400, "MISSING_FIELD", "batchId is required when approveAll is true.");
      }

      const actorStaffId = body.actorStaffId?.trim();
      if (!actorStaffId) {
        throw new PreviewApiError(400, "MISSING_FIELD", "actorStaffId is required when approveAll is true.");
      }

      const actor = await prisma.staff.findUnique({
        where: { id: actorStaffId },
        select: { id: true, role: true },
      });
      if (!actor) {
        throw new PreviewApiError(404, "ACTOR_NOT_FOUND", "actorStaffId does not match a Staff record.");
      }

      const ALLOWED_REVIEWER_ROLES = new Set(["SUPERVISOR", "CLINICAL_LEAD"]);
      if (!ALLOWED_REVIEWER_ROLES.has(String(actor.role))) {
        throw new PreviewApiError(
          403,
          "FORBIDDEN_ROLE",
          `Only SUPERVISOR or CLINICAL_LEAD can approve batches. Actor has role: ${actor.role}`
        );
      }

      const batch = await prisma.restorationBatch.findUnique({
        where: { id: batchId },
        select: { id: true, requestedByStaffId: true },
      });
      if (!batch) {
        throw new PreviewApiError(404, "BATCH_NOT_FOUND", "Restoration batch not found.");
      }

      if (actor.id === batch.requestedByStaffId) {
        throw new PreviewApiError(
          403,
          "SELF_APPROVAL_FORBIDDEN",
          "A reviewer cannot approve a batch they generated. Segregation of duties required."
        );
      }

      const now = new Date();
      const result = await prisma.restoredMealCandidate.updateMany({
        where: {
          restorationBatchId: batchId,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          reviewedByStaffId: actor.id,
          reviewedAt: now,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            batchId,
            approvedCount: result.count,
          },
        },
        { status: 200 }
      );
    }

    const candidateId = body.candidateId?.trim();
    if (!candidateId) {
      throw new PreviewApiError(400, "MISSING_FIELD", "candidateId is required.");
    }

    const data: Record<string, any> = {};
    if (body.amountEaten !== undefined) {
      const amount = String(body.amountEaten).trim();
      if (!ALLOWED_AMOUNT_EATEN.has(amount)) {
        throw new PreviewApiError(400, "INVALID_AMOUNT_EATEN", "amountEaten is not a valid enum value.");
      }
      data.amountEaten = amount;
    }

    if (body.timestamp !== undefined) {
      const timestamp = new Date(body.timestamp);
      if (Number.isNaN(timestamp.getTime())) {
        throw new PreviewApiError(400, "INVALID_DATE", "timestamp must be a valid date.");
      }
      data.timestamp = timestamp;
    }

    if (Object.keys(data).length === 0) {
      throw new PreviewApiError(400, "NO_FIELDS", "Provide at least one field to update.");
    }

    const existing = await prisma.restoredMealCandidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        participantId: true,
        timestamp: true,
        mealType: true,
        foodTexture: true,
        fluidThickness: true,
        volumeMl: true,
        amountEaten: true,
        swallowingObservations: true,
        deviationReason: true,
        restorationBatchId: true,
        generatedByStaffId: true,
        createdAt: true,
      },
    });
    if (!existing) {
      throw new PreviewApiError(404, "CANDIDATE_NOT_FOUND", "Candidate not found.");
    }

    const nextState = {
      ...existing,
      timestamp: (data.timestamp as Date | undefined) ?? existing.timestamp,
      amountEaten: (data.amountEaten as string | undefined) ?? existing.amountEaten,
    };
    const provenanceHash = computeMealCandidateHash({
      participantId: nextState.participantId,
      timestamp: nextState.timestamp,
      mealType: String(nextState.mealType),
      foodTexture: nextState.foodTexture,
      fluidThickness: nextState.fluidThickness,
      volumeMl: nextState.volumeMl,
      amountEaten: String(nextState.amountEaten),
      swallowingObservations: nextState.swallowingObservations as string[],
      deviationReason: nextState.deviationReason,
      restorationBatchId: nextState.restorationBatchId,
      generatedByStaffId: nextState.generatedByStaffId,
      createdAt: nextState.createdAt,
    });

    const updated = await prisma.restoredMealCandidate.update({
      where: { id: candidateId },
      data: {
        ...data,
        provenanceHash,
      },
      select: {
        id: true,
        timestamp: true,
        mealType: true,
        foodTexture: true,
        fluidThickness: true,
        volumeMl: true,
        amountEaten: true,
        deviationReason: true,
        status: true,
        provenanceHash: true,
      },
    });

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof PreviewApiError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details ?? null,
          },
        },
        { status: error.status }
      );
    }

    const prismaError = mapPrismaApiError(error);
    if (prismaError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: prismaError.code,
            message: prismaError.message,
            details: prismaError.details ?? null,
          },
        },
        { status: prismaError.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error while updating preview candidate.",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const batchId = String(body?.batchId ?? "").trim();
    if (!batchId) {
      throw new PreviewApiError(400, "MISSING_FIELD", "batchId is required.");
    }

    const batch = await prisma.restorationBatch.findUnique({
      where: { id: batchId },
      select: { id: true, status: true },
    });
    if (!batch) {
      throw new PreviewApiError(404, "BATCH_NOT_FOUND", "Restoration batch not found.");
    }
    if (batch.status !== "PENDING") {
      throw new PreviewApiError(
        409,
        "BATCH_NOT_PENDING",
        `Cannot discard batch with status ${batch.status}. Only PENDING batches can be discarded.`
      );
    }

    // Cascade deletes RestoredMealCandidate + RestoredMARCandidate via onDelete: Cascade
    await prisma.restorationBatch.delete({ where: { id: batchId } });

    return NextResponse.json({ ok: true, data: { deleted: batchId } });
  } catch (error) {
    if (error instanceof PreviewApiError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    const prismaError = mapPrismaApiError(error);
    if (prismaError) {
      return NextResponse.json(
        { ok: false, error: { code: prismaError.code, message: prismaError.message } },
        { status: prismaError.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Unexpected error while discarding batch." } },
      { status: 500 }
    );
  }
}
