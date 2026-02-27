import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const ALLOWED_COMMIT_ROLES = new Set(["SUPERVISOR", "CLINICAL_LEAD"]);
const COMMITTED_STATUS = "APPROVED";

type LegacyCommitRequestBody = {
  batchId?: string;
  actorStaffId?: string;
};

type GroupedCommitRequestBody = {
  marLogs?: any[];
  mealLogs?: any[];
  sleepLogs?: any[];
  bglLogs?: any[];
  bowelLogs?: any[];
  hygieneLogs?: any[];
  communityLogs?: any[];
  repositionLogs?: any[];
};

type CommitRequestBody = LegacyCommitRequestBody & GroupedCommitRequestBody;

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
  await tx.restorationBatch.update({
    where: { id: batchId },
    data: {
      // CandidateStatus enum currently uses APPROVED to represent committed review state.
      status: COMMITTED_STATUS,
      reviewedByStaffId: actorStaffId,
      reviewedAt,
    },
  });
  return COMMITTED_STATUS;
};

const parseJsonBody = async (request: NextRequest): Promise<CommitRequestBody> => {
  try {
    return (await request.json()) as CommitRequestBody;
  } catch {
    throw new CommitApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
};

const parseLegacyBody = (body: CommitRequestBody): Required<LegacyCommitRequestBody> => {
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

const hasGroupedPayload = (body: CommitRequestBody): boolean => {
  return [
    "marLogs",
    "mealLogs",
    "sleepLogs",
    "bglLogs",
    "bowelLogs",
    "hygieneLogs",
    "communityLogs",
    "repositionLogs",
  ].some((key) => key in body);
};

const asArray = (value: unknown, field: string): any[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new CommitApiError(400, "INVALID_PAYLOAD", `${field} must be an array.`);
  }
  return value;
};

const parseGroupedBody = (
  body: CommitRequestBody
): Required<GroupedCommitRequestBody> => {
  return {
    marLogs: asArray(body.marLogs, "marLogs"),
    mealLogs: asArray(body.mealLogs, "mealLogs"),
    sleepLogs: asArray(body.sleepLogs, "sleepLogs"),
    bglLogs: asArray(body.bglLogs, "bglLogs"),
    bowelLogs: asArray(body.bowelLogs, "bowelLogs"),
    hygieneLogs: asArray(body.hygieneLogs, "hygieneLogs"),
    communityLogs: asArray(body.communityLogs, "communityLogs"),
    repositionLogs: asArray(body.repositionLogs, "repositionLogs"),
  };
};

const toDate = (value: unknown, field: string): Date => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new CommitApiError(422, "INVALID_DATE", `Invalid ${field} value: ${String(value)}`);
  }
  return date;
};

const normalizeEntrySource = (value: unknown): "LIVE" | "RESTORED_APPROVED" | "AUDIT_RECOVERY" | "SYNTHETIC_QA" => {
  const source = String(value ?? "").toUpperCase();
  if (source === "RESTORED_APPROVED" || source === "AUDIT_RECOVERY" || source === "SYNTHETIC_QA") {
    return source;
  }
  return "LIVE";
};

const normalizeDataSource = (value: unknown): "SYNTHETIC_QA" | "PRODUCTION" => {
  const source = String(value ?? "").toUpperCase();
  return source === "PRODUCTION" ? "PRODUCTION" : "SYNTHETIC_QA";
};

const normalizeBowelType = (row: any): "BOWEL" | "FLUID_IN" | "FLUID_OUT" => {
  const explicit = String(row?.type ?? "").toUpperCase();
  if (explicit === "BOWEL") return "BOWEL";
  if (explicit === "FLUID_IN" || explicit === "INTAKE") return "FLUID_IN";
  if (explicit === "FLUID_OUT" || explicit === "OUTPUT") return "FLUID_OUT";

  if (row?.hadBowelMotion) return "BOWEL";
  const intake = Number(row?.fluidIntakeDeltaMl ?? 0);
  const output = Number(row?.fluidOutputDeltaMl ?? 0);
  return intake >= output ? "FLUID_IN" : "FLUID_OUT";
};

const normalizeBristolScore = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return value;
  const match = String(value).toUpperCase().match(/^S([1-7])$/);
  if (match) return Number(match[1]);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const commitGroupedLogs = async (body: CommitRequestBody) => {
  const {
    marLogs = [],
    mealLogs = [],
    sleepLogs = [],
    bglLogs = [],
    bowelLogs = [],
    hygieneLogs = [],
    communityLogs = [],
    repositionLogs = [],
  } = parseGroupedBody(body);

  return prisma.$transaction(async (tx) => {
    const txAny = tx as unknown as DynamicTx;
    const marModel = txAny.mARLog ?? txAny.marLog;

    if (!marModel?.createMany || !txAny.mealLog?.createMany) {
      throw new CommitApiError(500, "SCHEMA_NOT_READY", "Core MAR/Meal models are not available.");
    }
    if (!txAny.bglDiabetesLog?.createMany || !txAny.hygieneLog?.createMany) {
      throw new CommitApiError(500, "SCHEMA_NOT_READY", "Phase A strict models are not available.");
    }

    const writes = [];

    if (marLogs.length > 0) {
      writes.push(
        marModel.createMany({
          data: marLogs.map((row: any) => ({
            participantId: String(row.participantId),
            createdByStaffId: String(row.createdByStaffId ?? row.staffId),
            approvedByStaffId: row.approvedByStaffId ? String(row.approvedByStaffId) : null,
            restorationBatchId: row.restorationBatchId ? String(row.restorationBatchId) : null,
            source: normalizeEntrySource(row.source),
            scheduledAdminTime: toDate(row.scheduledAdminTime ?? row.loggedAt ?? row.actualAdminTime, "scheduledAdminTime"),
            actualAdminTime: toDate(row.actualAdminTime ?? row.loggedAt ?? row.scheduledAdminTime, "actualAdminTime"),
            medicationName: String(row.medicationName ?? "Unknown"),
            dosage: String(row.dosage ?? "Unknown"),
            route: String(row.route ?? "Unknown"),
            status: String(row.status ?? "ADMINISTERED"),
            omissionReason: row.omissionReason ? String(row.omissionReason) : null,
            provenanceHash: String(row.provenanceHash ?? sha256(row)),
          })),
        })
      );
    }

    if (mealLogs.length > 0) {
      writes.push(
        txAny.mealLog.createMany({
          data: mealLogs.map((row: any) => ({
            participantId: String(row.participantId),
            createdByStaffId: String(row.createdByStaffId ?? row.staffId),
            approvedByStaffId: row.approvedByStaffId ? String(row.approvedByStaffId) : null,
            restorationBatchId: row.restorationBatchId ? String(row.restorationBatchId) : null,
            source: normalizeEntrySource(row.source),
            timestamp: toDate(row.timestamp ?? row.loggedAt ?? row.checkedAt, "timestamp"),
            mealType: String(row.mealType ?? "SNACK"),
            foodTexture: Number(row.foodTexture ?? 1),
            fluidThickness: Number(row.fluidThickness ?? 1),
            volumeMl: Number(row.volumeMl ?? 0),
            amountEaten: String(row.amountEaten ?? "ZERO"),
            swallowingObservations: Array.isArray(row.swallowingObservations) ? row.swallowingObservations : [],
            deviationReason: row.deviationReason ? String(row.deviationReason) : null,
            incidentReference: row.incidentReference ? String(row.incidentReference) : null,
            provenanceHash: String(row.provenanceHash ?? sha256(row)),
          })),
        })
      );
    }

    if (sleepLogs.length > 0 && txAny.sleepSettlingLog?.createMany) {
      writes.push(
        txAny.sleepSettlingLog.createMany({
          data: sleepLogs.map((row: any) => {
            const status = String(row.status ?? "").toUpperCase();
            return {
              participantId: String(row.participantId),
              loggedByStaffId: String(row.loggedByStaffId ?? row.staffId),
              checkTime: toDate(row.checkTime ?? row.checkedAt ?? row.loggedAt, "checkTime"),
              status: status === "ASLEEP" || status === "AWAKE" || status === "AGITATED" ? status : null,
              intervention: row.intervention ? String(row.intervention) : null,
              source: normalizeEntrySource(row.source),
            };
          }),
        })
      );
    }

    if (bglLogs.length > 0) {
      writes.push(
        txAny.bglDiabetesLog.createMany({
          data: bglLogs.map((row: any) => ({
            source: normalizeDataSource(row.source),
            participantId: String(row.participantId),
            staffId: String(row.staffId ?? row.loggedByStaffId),
            localDate: String(row.localDate ?? toDate(row.loggedAt, "loggedAt").toISOString().slice(0, 10)),
            loggedAt: toDate(row.loggedAt, "loggedAt"),
            bglReadingMmolL: row.bglReadingMmolL == null ? null : Number(row.bglReadingMmolL),
            fastingStatus: String(row.fastingStatus ?? "UNKNOWN"),
            insulinAdministered: Boolean(row.insulinAdministered),
            insulinMarRefId: row.insulinMarRefId ? String(row.insulinMarRefId) : null,
            actionTaken: row.actionTaken ? String(row.actionTaken) : null,
            qaMeta: row.qaMeta ?? null,
          })),
        })
      );
    }

    if (bowelLogs.length > 0 && txAny.bowelFluidLog?.createMany) {
      writes.push(
        txAny.bowelFluidLog.createMany({
          data: bowelLogs.map((row: any) => {
            const type = normalizeBowelType(row);
            const volumeMl =
              row.volumeMl != null
                ? Number(row.volumeMl)
                : type === "FLUID_IN"
                  ? Number(row.fluidIntakeDeltaMl ?? 0)
                  : type === "FLUID_OUT"
                    ? Number(row.fluidOutputDeltaMl ?? 0)
                    : null;
            return {
              participantId: String(row.participantId),
              loggedByStaffId: String(row.loggedByStaffId ?? row.staffId),
              timestamp: toDate(row.timestamp ?? row.loggedAt, "timestamp"),
              type,
              volumeMl,
              bristolScale: normalizeBristolScore(row.bristolScale),
              notes: row.notes ? String(row.notes) : null,
              source: normalizeEntrySource(row.source),
            };
          }),
        })
      );
    }

    if (hygieneLogs.length > 0) {
      writes.push(
        txAny.hygieneLog.createMany({
          data: hygieneLogs.map((row: any) => ({
            source: normalizeDataSource(row.source),
            participantId: String(row.participantId),
            staffId: String(row.staffId ?? row.loggedByStaffId),
            localDate: String(row.localDate ?? toDate(row.loggedAt, "loggedAt").toISOString().slice(0, 10)),
            loggedAt: toDate(row.loggedAt, "loggedAt"),
            showerStatus: String(row.showerStatus ?? "UNKNOWN"),
            oralCareStatus: String(row.oralCareStatus ?? "UNKNOWN"),
            groomingStatus: String(row.groomingStatus ?? "UNKNOWN"),
            continenceCareStatus: String(row.continenceCareStatus ?? "UNKNOWN"),
            skinIntegrityChecked: String(row.skinIntegrityChecked ?? "UNKNOWN"),
            refusalReason: row.refusalReason ? String(row.refusalReason) : null,
            alternativeMethod: row.alternativeMethod ? String(row.alternativeMethod) : null,
            notes: row.notes ? String(row.notes) : null,
            qaMeta: row.qaMeta ?? null,
          })),
        })
      );
    }

    const communityModel = txAny.communityAccessLog ?? txAny.communityAccessQaLog;
    if (communityLogs.length > 0 && communityModel?.createMany) {
      writes.push(
        communityModel.createMany({
          data: communityLogs.map((row: any) => ({
            source: normalizeDataSource(row.source),
            participantId: String(row.participantId),
            staffId: String(row.staffId ?? row.loggedByStaffId),
            localDate: String(row.localDate ?? toDate(row.departedAt, "departedAt").toISOString().slice(0, 10)),
            departedAt: toDate(row.departedAt ?? row.loggedAt, "departedAt"),
            returnedAt: row.returnedAt ? toDate(row.returnedAt, "returnedAt") : null,
            destination: String(row.destination ?? "Unknown"),
            purpose: String(row.purpose ?? "OTHER"),
            transportMethod: String(row.transportMethod ?? "OTHER"),
            odometerStart: row.odometerStart == null ? null : Number(row.odometerStart),
            odometerEnd: row.odometerEnd == null ? null : Number(row.odometerEnd),
            notes: row.notes ? String(row.notes) : null,
            qaMeta: row.qaMeta ?? null,
          })),
        })
      );
    }

    const repositionModel = txAny.repositioningLog ?? txAny.repositioningQaLog;
    if (repositionLogs.length > 0 && repositionModel?.createMany) {
      writes.push(
        repositionModel.createMany({
          data: repositionLogs.map((row: any) => ({
            source: normalizeDataSource(row.source),
            participantId: String(row.participantId),
            staffId: String(row.staffId ?? row.loggedByStaffId),
            localDate: String(row.localDate ?? toDate(row.turnedAt, "turnedAt").toISOString().slice(0, 10)),
            turnedAt: toDate(row.turnedAt ?? row.loggedAt, "turnedAt"),
            position: String(row.position ?? "OTHER"),
            skinCheckOutcome: String(row.skinCheckOutcome ?? "UNKNOWN"),
            notes: row.notes ? String(row.notes) : null,
            planIntervalMin: row.planIntervalMin == null ? null : Number(row.planIntervalMin),
            qaMeta: row.qaMeta ?? null,
          })),
        })
      );
    }

    if (writes.length === 0) {
      throw new CommitApiError(400, "EMPTY_PAYLOAD", "No log arrays were provided for commit.");
    }

    await Promise.all(writes);

    return {
      mode: "grouped",
      marCommitted: marLogs.length,
      mealCommitted: mealLogs.length,
      sleepCommitted: sleepLogs.length,
      bglCommitted: bglLogs.length,
      bowelCommitted: bowelLogs.length,
      hygieneCommitted: hygieneLogs.length,
      communityCommitted: communityLogs.length,
      repositionCommitted: repositionLogs.length,
      totalCommitted:
        marLogs.length +
        mealLogs.length +
        sleepLogs.length +
        bglLogs.length +
        bowelLogs.length +
        hygieneLogs.length +
        communityLogs.length +
        repositionLogs.length,
    };
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);

    if (hasGroupedPayload(body)) {
      const groupedResult = await commitGroupedLogs(body);
      return NextResponse.json({ ok: true, data: groupedResult }, { status: 200 });
    }

    const { batchId, actorStaffId } = parseLegacyBody(body);

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

      const existingMealCommittedCount = await txAny.mealLog.count({
        where: {
          restorationBatchId: batchId,
          source: "RESTORED_APPROVED",
        },
      });
      const existingMarCommittedCount =
        typeof txAny.marLog?.count === "function"
          ? await txAny.marLog.count({
              where: {
                restorationBatchId: batchId,
                source: "RESTORED_APPROVED",
              },
            })
          : 0;

      if (existingMealCommittedCount > 0 || existingMarCommittedCount > 0) {
        throw new CommitApiError(409, "BATCH_ALREADY_COMMITTED", "This batch has already been committed.");
      }

      const approvedMealCandidates = await txAny.restoredMealCandidate.findMany({
        where: {
          restorationBatchId: batchId,
          status: "APPROVED",
        },
        orderBy: { timestamp: "asc" },
      });
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
      if (approvedMealCandidates.length === 0 && approvedMarCandidates.length === 0) {
        throw new CommitApiError(
          409,
          "NO_APPROVED_CANDIDATES",
          "No approved meal or MAR candidates found for this batch."
        );
      }

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
          message: "Unexpected server error during commit.",
        },
      },
      { status: 500 }
    );
  }
}
