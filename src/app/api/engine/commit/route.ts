import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const ALLOWED_COMMIT_ROLES = new Set(["SUPERVISOR", "CLINICAL_LEAD"]);
const PRIMARY_COMMITTED_STATUS = "COMPLETED";
const FALLBACK_COMMITTED_STATUS = "APPROVED";

type CommitRequestBody = {
  batchId?: string;
  actorStaffId?: string;
};

type DynamicTx = Record<string, any>;

class CommitApiError extends Error {
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

const sha256 = (payload: unknown): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const toIso = (value: unknown): string => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new CommitApiError(422, "INVALID_DATE", `Invalid date value received: ${String(value)}`);
  }

  return date.toISOString();
};

const recomputeMealCandidateHash = (candidate: any): string => {
  const generatedAt = candidate.generatedAt ?? candidate.createdAt;
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
    generatedAt: toIso(generatedAt),
  });
};

const recomputeMarCandidateHash = (candidate: any): string => {
  const generatedAt = candidate.generatedAt ?? candidate.createdAt;
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
    generatedAt: toIso(generatedAt),
  });
};

const ensureRequiredModels = (tx: DynamicTx): void => {
  const requiredModels = [
    "staff",
    "restorationBatch",
    "restoredMealCandidate",
    "mealLog",
    "auditEvent",
  ];

  const missingModels = requiredModels.filter((modelName) => typeof tx[modelName] !== "object");
  if (missingModels.length > 0) {
    throw new CommitApiError(
      500,
      "SCHEMA_NOT_READY",
      "Prisma client does not expose required audit-ready models.",
      {
        missingModels,
        hint: "Generate Prisma client from prisma/schema.audit-ready.prisma before using this endpoint.",
      }
    );
  }
};

const updateBatchAsCommitted = async (
  tx: DynamicTx,
  batchId: string,
  actorStaffId: string,
  reviewedAt: Date
): Promise<string> => {
  try {
    await tx.restorationBatch.update({
      where: { id: batchId },
      data: {
        status: PRIMARY_COMMITTED_STATUS,
        reviewedByStaffId: actorStaffId,
        reviewedAt,
      },
    });
    return PRIMARY_COMMITTED_STATUS;
  } catch {
    await tx.restorationBatch.update({
      where: { id: batchId },
      data: {
        status: FALLBACK_COMMITTED_STATUS,
        reviewedByStaffId: actorStaffId,
        reviewedAt,
      },
    });
    return FALLBACK_COMMITTED_STATUS;
  }
};

const parseBody = async (request: NextRequest): Promise<Required<CommitRequestBody>> => {
  let body: CommitRequestBody;
  try {
    body = (await request.json()) as CommitRequestBody;
  } catch {
    throw new CommitApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const batchId = body.batchId?.trim();
  const actorStaffId = body.actorStaffId?.trim();

  if (!batchId) {
    throw new CommitApiError(400, "MISSING_BATCH_ID", "batchId is required.");
  }

  if (!actorStaffId) {
    throw new CommitApiError(400, "MISSING_ACTOR", "actorStaffId is required.");
  }

  return { batchId, actorStaffId };
};

export async function POST(request: NextRequest) {
  try {
    const { batchId, actorStaffId } = await parseBody(request);

    const result = await prisma.$transaction(async (tx) => {
      const txAny = tx as unknown as DynamicTx;
      ensureRequiredModels(txAny);

      const actor = await txAny.staff.findUnique({
        where: { id: actorStaffId },
        select: { id: true, role: true },
      });
      if (!actor) {
        throw new CommitApiError(403, "ACTOR_NOT_FOUND", "Committing staff member was not found.");
      }
      if (!ALLOWED_COMMIT_ROLES.has(String(actor.role))) {
        throw new CommitApiError(403, "FORBIDDEN_ROLE", "Only SUPERVISOR or CLINICAL_LEAD can commit.");
      }

      const batch = await txAny.restorationBatch.findUnique({
        where: { id: batchId },
        select: { id: true, participantId: true, status: true },
      });
      if (!batch) {
        throw new CommitApiError(404, "BATCH_NOT_FOUND", "Restoration batch not found.");
      }

      const existingCommittedCount = await txAny.mealLog.count({
        where: {
          restorationBatchId: batchId,
          source: "RESTORED_APPROVED",
        },
      });
      if (existingCommittedCount > 0) {
        throw new CommitApiError(409, "BATCH_ALREADY_COMMITTED", "This batch has already been committed.");
      }

      const approvedMealCandidates = await txAny.restoredMealCandidate.findMany({
        where: {
          restorationBatchId: batchId,
          status: "APPROVED",
        },
        orderBy: { timestamp: "asc" },
      });
      if (approvedMealCandidates.length === 0) {
        throw new CommitApiError(
          409,
          "NO_APPROVED_CANDIDATES",
          "No approved meal candidates found for this batch."
        );
      }

      const invalidMealCandidateIds: string[] = [];
      for (const candidate of approvedMealCandidates) {
        const expectedHash = recomputeMealCandidateHash(candidate);
        if (expectedHash !== candidate.provenanceHash) {
          invalidMealCandidateIds.push(candidate.id);
        }
      }
      if (invalidMealCandidateIds.length > 0) {
        throw new CommitApiError(
          409,
          "PROVENANCE_HASH_MISMATCH",
          "One or more meal candidates failed provenance hash verification.",
          { candidateIds: invalidMealCandidateIds }
        );
      }

      const approvedMarCandidates =
        typeof txAny.restoredMARCandidate?.findMany === "function"
          ? await txAny.restoredMARCandidate.findMany({
              where: {
                restorationBatchId: batchId,
                statusReview: "APPROVED",
              },
              orderBy: { scheduledAdminTime: "asc" },
            })
          : [];

      const invalidMarCandidateIds: string[] = [];
      for (const candidate of approvedMarCandidates) {
        const expectedHash = recomputeMarCandidateHash(candidate);
        if (expectedHash !== candidate.provenanceHash) {
          invalidMarCandidateIds.push(candidate.id);
        }
      }
      if (invalidMarCandidateIds.length > 0) {
        throw new CommitApiError(
          409,
          "PROVENANCE_HASH_MISMATCH",
          "One or more MAR candidates failed provenance hash verification.",
          { candidateIds: invalidMarCandidateIds }
        );
      }

      const now = new Date();

      for (const candidate of approvedMealCandidates) {
        await txAny.mealLog.create({
          data: {
            participantId: candidate.participantId,
            createdByStaffId: candidate.generatedByStaffId,
            approvedByStaffId: actorStaffId,
            restorationBatchId: batchId,
            source: "RESTORED_APPROVED",
            timestamp: candidate.timestamp,
            mealType: candidate.mealType,
            foodTexture: candidate.foodTexture,
            fluidThickness: candidate.fluidThickness,
            volumeMl: candidate.volumeMl,
            amountEaten: candidate.amountEaten,
            swallowingObservations: candidate.swallowingObservations,
            deviationReason: candidate.deviationReason,
            incidentReference: candidate.incidentReference,
            provenanceHash: candidate.provenanceHash,
          },
        });
      }

      if (typeof txAny.marLog?.create === "function") {
        for (const candidate of approvedMarCandidates) {
          await txAny.marLog.create({
            data: {
              participantId: candidate.participantId,
              createdByStaffId: candidate.generatedByStaffId,
              approvedByStaffId: actorStaffId,
              restorationBatchId: batchId,
              source: "RESTORED_APPROVED",
              scheduledAdminTime: candidate.scheduledAdminTime,
              actualAdminTime: candidate.actualAdminTime,
              medicationName: candidate.medicationName,
              dosage: candidate.dosage,
              route: candidate.route,
              status: candidate.status,
              omissionReason: candidate.omissionReason,
              provenanceHash: candidate.provenanceHash,
            },
          });
        }
      }

      const batchStatus = await updateBatchAsCommitted(txAny, batchId, actorStaffId, now);

      const previousAuditEvent = await txAny.auditEvent.findFirst({
        where: { participantId: batch.participantId },
        orderBy: { createdAt: "desc" },
        select: { payloadHash: true },
      });

      const payloadHash = sha256({
        batchId,
        participantId: batch.participantId,
        committedBy: actorStaffId,
        committedAt: now.toISOString(),
        mealCount: approvedMealCandidates.length,
        marCount: approvedMarCandidates.length,
      });

      const auditEvent = await txAny.auditEvent.create({
        data: {
          actorStaffId,
          participantId: batch.participantId,
          action: "LEDGER_WRITTEN",
          entityType: "RestorationBatch",
          entityId: batchId,
          payloadHash,
          previousHash: previousAuditEvent?.payloadHash ?? null,
        },
      });

      return {
        batchId,
        participantId: batch.participantId,
        batchStatus,
        mealCommitted: approvedMealCandidates.length,
        marCommitted: approvedMarCandidates.length,
        auditEventId: auditEvent.id,
      };
    });

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof CommitApiError) {
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

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error during commit.",
        },
      },
      { status: 500 }
    );
  }
}
