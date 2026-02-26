import { createHash } from "node:crypto";
import { MealType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { RestorationEngine } from "../../../../services/restoration/restorationEngine";

export const runtime = "nodejs";

const MAX_PREVIEW_DAYS = 31;

type PreviewRequestBody = {
  participantId?: string;
  startDate?: string;
  endDate?: string;
  generatedByStaffId?: string;
};

type MealTemplate = {
  mealType: MealType;
  hour: number;
  minute: number;
  targetVolumeMl: number;
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

export async function POST(request: NextRequest) {
  try {
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

    const recoveryStart = startOfDay(parseRequiredDate(body.startDate, "startDate"));
    const recoveryEnd = endOfDay(parseRequiredDate(body.endDate, "endDate"));
    if (recoveryEnd.getTime() < recoveryStart.getTime()) {
      throw new PreviewApiError(400, "INVALID_RANGE", "endDate must be on or after startDate.");
    }

    const requestedDays = differenceInDaysInclusive(recoveryStart, recoveryEnd);
    if (requestedDays > MAX_PREVIEW_DAYS) {
      throw new PreviewApiError(
        400,
        "RANGE_TOO_LARGE",
        `Date range is too large. Max supported preview is ${MAX_PREVIEW_DAYS} days.`
      );
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
      throw new PreviewApiError(
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
      throw new PreviewApiError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.restorationBatch.create({
        data: {
          participantId: participant.id,
          requestedByStaffId: generatedByStaff.id,
          reason: `Preview generation ${recoveryStart.toISOString()} -> ${recoveryEnd.toISOString()}`,
          recoveryStart,
          recoveryEnd,
          status: "PENDING",
        },
        select: { id: true, participantId: true },
      });

      const engine = new RestorationEngine();
      const generatedRows: any[] = [];

      for (const day of dayIterator(recoveryStart, recoveryEnd)) {
        for (const template of DEFAULT_MEAL_TEMPLATES) {
          const generatedAt = new Date();
          const generated = engine.restoreMealCandidate(
            {
              participantId: participant.id,
              defaultFoodTexture: participant.defaultFoodTexture,
              defaultFluidThickness: participant.defaultFluidThickness,
            },
            {
              scheduledTime: makeScheduledTime(day, template.hour, template.minute),
              mealType: template.mealType,
              targetVolumeMl: template.targetVolumeMl,
            },
            {
              restorationBatchId: batch.id,
              generatedByStaffId: generatedByStaff.id,
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
            generatedByStaffId: generatedByStaff.id,
            createdAt: generatedAt,
          });

          const persisted = await tx.restoredMealCandidate.create({
            data: {
              restorationBatchId: batch.id,
              participantId: generated.participantId,
              generatedByStaffId: generatedByStaff.id,
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
          message: "Unexpected server error while updating preview candidate.",
        },
      },
      { status: 500 }
    );
  }
}
