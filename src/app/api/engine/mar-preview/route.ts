import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { RestorationEngine } from "../../../../services/restoration/restorationEngine";
import { deriveParticipantBaselines } from "../../../../services/restoration/personalizationEngine";

export const runtime = "nodejs";

const MAX_PREVIEW_DAYS = 31;
const MAX_MEDICATIONS = 20;
const TIME_24H_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type MARPreviewRequestBody = {
  participantId?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  generatedByStaffId?: string;
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

type MedicationTemplate = {
  name: string;
  dosage: string;
  route: string;
  hour: number;
  minute: number;
};

type TimeParts = {
  hour: number;
  minute: number;
};

class MARPreviewApiError extends Error {
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

const ALLOWED_MAR_STATUS = new Set([
  "ADMINISTERED",
  "REFUSED",
  "HELD",
]);

const sha256 = (payload: unknown): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const toIso = (value: unknown): string => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new MARPreviewApiError(422, "INVALID_DATE", `Invalid date value received: ${String(value)}`);
  }
  return date.toISOString();
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
    throw new MARPreviewApiError(400, "MISSING_FIELD", `${fieldName} is required.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new MARPreviewApiError(400, "INVALID_DATE", `${fieldName} must be a valid date.`);
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
    throw new MARPreviewApiError(400, "INVALID_TIME", `${fieldName} must use HH:mm 24-hour format.`);
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

const makeScheduledAdminTime = (baseDay: Date, hour: number, minute: number): Date => {
  const scheduled = new Date(baseDay);
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled;
};

export async function POST(request: NextRequest) {
  try {
    let body: MARPreviewRequestBody;
    try {
      body = (await request.json()) as MARPreviewRequestBody;
    } catch {
      throw new MARPreviewApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const participantId = body.participantId?.trim();
    if (!participantId) {
      throw new MARPreviewApiError(400, "MISSING_FIELD", "participantId is required.");
    }

    const startDate = parseRequiredDate(body.startDate, "startDate");
    const endDate = parseRequiredDate(body.endDate, "endDate");
    const startTime = parseTimeOrDefault(body.startTime, "startTime", { hour: 0, minute: 0 });
    const endTime = parseTimeOrDefault(body.endTime, "endTime", { hour: 23, minute: 59 });

    const recoveryStart = withTime(startDate, startTime.hour, startTime.minute, 0, 0);
    const recoveryEnd = withTime(endDate, endTime.hour, endTime.minute, 59, 999);
    if (recoveryEnd.getTime() < recoveryStart.getTime()) {
      throw new MARPreviewApiError(400, "INVALID_RANGE", "endDate must be on or after startDate.");
    }

    const rangeStart = startOfDay(startDate);
    const rangeEnd = endOfDay(endDate);
    const requestedDays = differenceInDaysInclusive(rangeStart, rangeEnd);
    if (requestedDays > MAX_PREVIEW_DAYS) {
      throw new MARPreviewApiError(
        400,
        "RANGE_TOO_LARGE",
        `Date range is too large. Max supported preview is ${MAX_PREVIEW_DAYS} days.`
      );
    }

    const medications = body.medications ?? [];
    if (medications.length === 0) {
      throw new MARPreviewApiError(400, "MISSING_MEDICATIONS", "At least one medication is required.");
    }
    if (medications.length > MAX_MEDICATIONS) {
      throw new MARPreviewApiError(
        400,
        "TOO_MANY_MEDICATIONS",
        `Maximum ${MAX_MEDICATIONS} medications are supported.`
      );
    }

    const medicationTemplates: MedicationTemplate[] = [];
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      const name = med.name?.trim();
      if (!name) {
        throw new MARPreviewApiError(400, "INVALID_MEDICATION", `Medication ${i} name is required.`);
      }

      const dosage = med.dosage?.trim() ?? "";
      const route = med.route?.trim() ?? "";
      const hour = med.hour ?? 0;
      const minute = med.minute ?? 0;

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new MARPreviewApiError(
          400,
          "INVALID_TIME",
          `Medication ${i} has invalid time (hour: ${hour}, minute: ${minute}).`
        );
      }

      medicationTemplates.push({
        name,
        dosage,
        route,
        hour,
        minute,
      });
    }

    const generatedByStaff = body.generatedByStaffId?.trim()
      ? await prisma.staff.findUnique({
          where: { id: body.generatedByStaffId.trim() },
          select: { id: true, role: true },
        })
      : await prisma.staff.findFirst({
          where: { role: { in: ["SUPERVISOR", "CLINICAL_LEAD", "SUPPORT_WORKER"] } },
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true },
        });

    if (!generatedByStaff) {
      throw new MARPreviewApiError(
        409,
        "STAFF_REQUIRED",
        "No staff record is available. Create a Staff row before generating preview batches."
      );
    }

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        defaultFoodTexture: true,
        defaultFluidThickness: true,
      },
    });

    if (!participant) {
      throw new MARPreviewApiError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.restorationBatch.create({
        data: {
          participantId: participant.id,
          requestedByStaffId: generatedByStaff.id,
          reason: `MAR preview generation ${recoveryStart.toISOString()} -> ${recoveryEnd.toISOString()}`,
          recoveryStart,
          recoveryEnd,
          status: "PENDING",
        },
        select: { id: true, participantId: true },
      });

      const engine = new RestorationEngine();
      const generatedRows: any[] = [];

      // Derive personalization baselines from participant's historical logs
      const baselines = await deriveParticipantBaselines(participant.id);

      for (const day of dayIterator(rangeStart, rangeEnd)) {
        for (const template of medicationTemplates) {
          const scheduledAdminTime = makeScheduledAdminTime(day, template.hour, template.minute);
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
              medicationName: template.name,
              dosage: template.dosage,
              route: template.route,
            },
            {
              restorationBatchId: batch.id,
              generatedByStaffId: generatedByStaff.id,
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
            generatedByStaffId: generatedByStaff.id,
            createdAt: generatedAt,
          });

          const persisted = await tx.restoredMARCandidate.create({
            data: {
              restorationBatchId: batch.id,
              participantId: generated.participantId,
              generatedByStaffId: generatedByStaff.id,
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

          generatedRows.push(persisted);
        }
      }

      return {
        batchId: batch.id,
        participantId: batch.participantId,
        generatedByStaffId: generatedByStaff.id,
        candidateCount: generatedRows.length,
        candidates: generatedRows,
      };
    });

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof MARPreviewApiError) {
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

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "Database is not reachable. Check DATABASE_URL and database service state.",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error during MAR preview generation.",
        },
      },
      { status: 500 }
    );
  }
}

type MARPatchRequestBody = {
  candidateId?: string;
  batchId?: string;
  approveAll?: boolean;
  actorStaffId?: string;
  status?: string;
  actualAdminTime?: string;
};

export async function PATCH(request: NextRequest) {
  try {
    let body: MARPatchRequestBody;
    try {
      body = (await request.json()) as MARPatchRequestBody;
    } catch {
      throw new MARPreviewApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    if (body.approveAll === true) {
      const batchId = body.batchId?.trim();
      if (!batchId) {
        throw new MARPreviewApiError(400, "MISSING_FIELD", "batchId is required when approveAll is true.");
      }

      const actorStaffId = body.actorStaffId?.trim();
      if (!actorStaffId) {
        throw new MARPreviewApiError(400, "MISSING_FIELD", "actorStaffId is required when approveAll is true.");
      }

      const actor = await prisma.staff.findUnique({
        where: { id: actorStaffId },
        select: { id: true, role: true },
      });
      if (!actor) {
        throw new MARPreviewApiError(404, "ACTOR_NOT_FOUND", "actorStaffId does not match a Staff record.");
      }

      const ALLOWED_REVIEWER_ROLES = new Set(["SUPERVISOR", "CLINICAL_LEAD"]);
      if (!ALLOWED_REVIEWER_ROLES.has(String(actor.role))) {
        throw new MARPreviewApiError(
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
        throw new MARPreviewApiError(404, "BATCH_NOT_FOUND", "Restoration batch not found.");
      }

      if (actor.id === batch.requestedByStaffId) {
        throw new MARPreviewApiError(
          403,
          "SELF_APPROVAL_FORBIDDEN",
          "A reviewer cannot approve a batch they generated. Segregation of duties required."
        );
      }

      const now = new Date();
      const result = await prisma.restoredMARCandidate.updateMany({
        where: {
          restorationBatchId: batchId,
          statusReview: "PENDING",
        },
        data: {
          statusReview: "APPROVED",
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
      throw new MARPreviewApiError(400, "MISSING_FIELD", "candidateId is required.");
    }

    const data: Record<string, any> = {};
    if (body.status !== undefined) {
      const status = String(body.status).trim();
      if (!ALLOWED_MAR_STATUS.has(status)) {
        throw new MARPreviewApiError(400, "INVALID_STATUS", "status is not a valid enum value.");
      }
      data.status = status;
    }

    if (body.actualAdminTime !== undefined) {
      const actualAdminTime = new Date(body.actualAdminTime);
      if (Number.isNaN(actualAdminTime.getTime())) {
        throw new MARPreviewApiError(400, "INVALID_DATE", "actualAdminTime must be a valid date.");
      }
      data.actualAdminTime = actualAdminTime;
    }

    if (Object.keys(data).length === 0) {
      throw new MARPreviewApiError(400, "NO_FIELDS", "Provide at least one field to update.");
    }

    const existing = await prisma.restoredMARCandidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        participantId: true,
        scheduledAdminTime: true,
        actualAdminTime: true,
        medicationName: true,
        dosage: true,
        route: true,
        status: true,
        omissionReason: true,
        statusComment: true,
        restorationBatchId: true,
        generatedByStaffId: true,
        createdAt: true,
      },
    });
    if (!existing) {
      throw new MARPreviewApiError(404, "CANDIDATE_NOT_FOUND", "Candidate not found.");
    }

    const nextState = {
      ...existing,
      scheduledAdminTime: existing.scheduledAdminTime,
      actualAdminTime: (data.actualAdminTime as Date | undefined) ?? existing.actualAdminTime,
      status: (data.status as string | undefined) ?? existing.status,
    };
    const provenanceHash = computeMarCandidateHash({
      participantId: nextState.participantId,
      scheduledAdminTime: nextState.scheduledAdminTime,
      actualAdminTime: nextState.actualAdminTime,
      medicationName: String(nextState.medicationName),
      dosage: String(nextState.dosage),
      route: String(nextState.route),
      status: String(nextState.status),
      omissionReason: nextState.omissionReason,
      statusComment: nextState.statusComment,
      restorationBatchId: nextState.restorationBatchId,
      generatedByStaffId: nextState.generatedByStaffId,
      createdAt: nextState.createdAt,
    });

    const updated = await prisma.restoredMARCandidate.update({
      where: { id: candidateId },
      data: {
        ...data,
        provenanceHash,
      },
      select: {
        id: true,
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

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof MARPreviewApiError) {
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

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "Database is not reachable. Check DATABASE_URL and database service state.",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error while updating MAR preview candidate.",
        },
      },
      { status: 500 }
    );
  }
}
