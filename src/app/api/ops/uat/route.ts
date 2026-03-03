import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { NextRequest, NextResponse } from "next/server";
import { EntrySource, PrismaClient } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { verifySession, getSessionTokenFromRequest } from "../../../../lib/session";

export const runtime = "nodejs";

type StressMode = "simple" | "realistic";

type StressPayload = {
  action: "stress";
  concurrency?: number;
  durationSec?: number;
  mode?: StressMode;
  maxErrorRate?: number;
  maxP95Ms?: number;
};

type CleanupPayload = {
  action: "cleanup";
  participantKey?: string;
  olderThanDays?: number;
  includeLive?: boolean;
  apply?: boolean;
  confirmationText?: string;
};

type GlobalNukePayload = {
  action: "global_nuke";
  apply?: boolean;
  confirmationText?: string;
};

type UatPayload = StressPayload | CleanupPayload | GlobalNukePayload;

type ReportArtifact = {
  artifactId: string;
  fileName: string;
  filePath: string;
  writeStatus: "written" | "write_failed";
  writeError: string | null;
  report: unknown;
};

const STRESS_DEFAULTS = {
  concurrency: 20,
  durationSec: 45,
  mode: "simple" as StressMode,
  maxErrorRate: 0.02,
  maxP95Ms: 350,
};

const STRESS_LIMITS = {
  maxConcurrency: 80,
  maxDurationSec: 180,
};

class OpsApiError extends Error {
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

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeError(error: unknown): string {
  const anyErr = error as { code?: string; name?: string; message?: string };
  if (typeof anyErr?.code === "string") return anyErr.code;
  if (typeof anyErr?.name === "string") return anyErr.name;
  if (typeof anyErr?.message === "string") return anyErr.message.slice(0, 120);
  return "UNKNOWN_ERROR";
}

async function requireFullSession(request: NextRequest): Promise<void> {
  const sessionToken = getSessionTokenFromRequest(request);
  if (!sessionToken) {
    throw new OpsApiError(401, "UNAUTHORIZED", "Login required.");
  }

  const session = await verifySession(sessionToken);
  if (!session || session.role !== "full") {
    throw new OpsApiError(401, "UNAUTHORIZED", "Full access session required.");
  }
}

function getCommitRef(): string {
  return (
    process.env.COMMIT_REF ??
    process.env.GITHUB_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "unknown"
  );
}

function getReportDir(): string {
  if (process.env.UAT_REPORT_DIR) return process.env.UAT_REPORT_DIR;
  if (process.env.NETLIFY) return "/tmp/chartgen-uat-reports";
  return path.join(process.cwd(), "reports", "uat");
}

async function writeArtifact(kind: string, payload: unknown): Promise<ReportArtifact> {
  const createdAt = new Date().toISOString();
  const artifactId = `${kind}-${createdAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const fileName = `${artifactId}.json`;
  const filePath = path.join(getReportDir(), fileName);

  const report = {
    artifactVersion: "1.0",
    artifactId,
    kind,
    createdAt,
    commitRef: getCommitRef(),
    payload,
  };

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return {
      artifactId,
      fileName,
      filePath,
      writeStatus: "written",
      writeError: null,
      report,
    };
  } catch (error) {
    return {
      artifactId,
      fileName,
      filePath,
      writeStatus: "write_failed",
      writeError: String(error),
      report,
    };
  }
}

async function runStressQuery(client: PrismaClient, mode: StressMode): Promise<void> {
  if (mode === "simple") {
    await client.$queryRaw`SELECT 1`;
    return;
  }

  await client.$transaction([
    client.$queryRaw`SELECT COUNT(*)::int AS count FROM "RestorationBatch"`,
    client.$queryRaw`SELECT COUNT(*)::int AS count FROM "RestoredMealCandidate"`,
    client.$queryRaw`SELECT COUNT(*)::int AS count FROM "RestoredMARCandidate"`,
  ]);
}

async function executeStressRun(input: StressPayload) {
  const concurrency = Math.min(
    STRESS_LIMITS.maxConcurrency,
    Math.max(1, Math.floor(toNumber(input.concurrency, STRESS_DEFAULTS.concurrency))),
  );
  const durationSec = Math.min(
    STRESS_LIMITS.maxDurationSec,
    Math.max(1, Math.floor(toNumber(input.durationSec, STRESS_DEFAULTS.durationSec))),
  );
  const mode = input.mode === "realistic" ? "realistic" : STRESS_DEFAULTS.mode;
  const maxErrorRate = Math.max(0, Math.min(1, toNumber(input.maxErrorRate, STRESS_DEFAULTS.maxErrorRate)));
  const maxP95Ms = Math.max(1, toNumber(input.maxP95Ms, STRESS_DEFAULTS.maxP95Ms));

  const client = new PrismaClient({ log: ["error"] });
  const latenciesMs: number[] = [];
  const errors = new Map<string, number>();
  let successCount = 0;
  let failureCount = 0;

  const startedAt = Date.now();
  const stopAt = startedAt + durationSec * 1000;

  async function workerLoop() {
    while (Date.now() < stopAt) {
      const t0 = process.hrtime.bigint();
      try {
        await runStressQuery(client, mode);
        successCount += 1;
      } catch (error) {
        failureCount += 1;
        const key = normalizeError(error);
        errors.set(key, (errors.get(key) ?? 0) + 1);
      } finally {
        const elapsedMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
        latenciesMs.push(elapsedMs);
      }
    }
  }

  try {
    await client.$connect();
    await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
  } finally {
    await client.$disconnect();
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const total = successCount + failureCount;
  const errorRate = total > 0 ? failureCount / total : 1;
  const p50 = percentile(latenciesMs, 50);
  const p95 = percentile(latenciesMs, 95);
  const p99 = percentile(latenciesMs, 99);
  const max = latenciesMs.length ? Math.max(...latenciesMs) : 0;
  const min = latenciesMs.length ? Math.min(...latenciesMs) : 0;

  return {
    startedAt: new Date(startedAt).toISOString(),
    elapsedSec: round(elapsedSec),
    mode,
    concurrency,
    requests: {
      total,
      success: successCount,
      failed: failureCount,
      perSecond: round(total / Math.max(elapsedSec, 1)),
      errorRate: round(errorRate),
    },
    latencyMs: {
      min: round(min),
      avg: round(average(latenciesMs)),
      p50: round(p50),
      p95: round(p95),
      p99: round(p99),
      max: round(max),
    },
    thresholds: {
      maxErrorRate,
      maxP95Ms,
    },
    pass: errorRate <= maxErrorRate && p95 <= maxP95Ms && successCount > 0,
    errors: Object.fromEntries(errors),
  };
}

function buildCreatedAtFilter(days: number) {
  if (days <= 0) return undefined;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { lt: cutoff };
}

function withCreatedAt<T extends object>(base: T, createdAt: { lt: Date } | undefined): T | (T & { createdAt: { lt: Date } }) {
  if (!createdAt) return base;
  return { ...base, createdAt };
}

async function executeCleanup(payload: CleanupPayload) {
  const participantKey = String(payload.participantKey ?? "").trim();
  if (!participantKey) {
    throw new OpsApiError(400, "MISSING_PARTICIPANT_KEY", "`participantKey` is required.");
  }

  const olderThanDays = Math.max(0, Math.floor(toNumber(payload.olderThanDays, 2)));
  const includeLive = Boolean(payload.includeLive);
  const apply = Boolean(payload.apply);
  const createdAt = buildCreatedAtFilter(olderThanDays);

  const marLogModel = (prisma as any).mARLog ?? (prisma as any).marLog;
  if (!marLogModel) {
    throw new OpsApiError(
      500,
      "MAR_MODEL_UNAVAILABLE",
      "Prisma MARLog model is unavailable on this client.",
    );
  }

  const participant = await prisma.participant.findFirst({
    where: {
      OR: [{ id: participantKey }, { externalReference: participantKey }],
    },
    select: { id: true, externalReference: true, fullName: true },
  });

  if (!participant) {
    throw new OpsApiError(
      404,
      "PARTICIPANT_NOT_FOUND",
      `Participant not found for key "${participantKey}".`,
    );
  }

  const sourceFilter = includeLive
    ? undefined
    : { in: [EntrySource.RESTORED_APPROVED, EntrySource.AUDIT_RECOVERY] };

  const baseParticipantFilter = { participantId: participant.id };
  const mealLogFilter = withCreatedAt(
    sourceFilter ? { ...baseParticipantFilter, source: sourceFilter } : baseParticipantFilter,
    createdAt,
  );
  const marLogFilter = withCreatedAt(
    sourceFilter ? { ...baseParticipantFilter, source: sourceFilter } : baseParticipantFilter,
    createdAt,
  );

  const scopeFilter = withCreatedAt(baseParticipantFilter, createdAt);

  const counts = {
    restorationBatch: await prisma.restorationBatch.count({ where: scopeFilter }),
    restoredMealCandidate: await prisma.restoredMealCandidate.count({ where: scopeFilter }),
    restoredMARCandidate: await prisma.restoredMARCandidate.count({ where: scopeFilter }),
    mealLog: await prisma.mealLog.count({ where: mealLogFilter }),
    marLog: await marLogModel.count({ where: marLogFilter }),
    auditEvent: await prisma.auditEvent.count({ where: scopeFilter }),
  };

  const requiredConfirmationText = `DELETE-TEST-DATA-${participant.id}${includeLive ? "-INCLUDING-LIVE" : ""}`;

  if (!apply) {
    return {
      mode: "DRY_RUN",
      participant,
      olderThanDays,
      includeLive,
      requiredConfirmationText,
      counts,
    };
  }

  if (payload.confirmationText !== requiredConfirmationText) {
    throw new OpsApiError(
      400,
      "CONFIRMATION_REQUIRED",
      "Apply mode requires exact confirmation text.",
      { requiredConfirmationText },
    );
  }

  const [auditEvent, restoredMealCandidate, restoredMARCandidate, mealLog, marLog, restorationBatch] =
    await prisma.$transaction([
      prisma.auditEvent.deleteMany({ where: scopeFilter }),
      prisma.restoredMealCandidate.deleteMany({ where: scopeFilter }),
      prisma.restoredMARCandidate.deleteMany({ where: scopeFilter }),
      prisma.mealLog.deleteMany({ where: mealLogFilter }),
      marLogModel.deleteMany({ where: marLogFilter }),
      prisma.restorationBatch.deleteMany({ where: scopeFilter }),
    ]);

  return {
    mode: "APPLY",
    participant,
    olderThanDays,
    includeLive,
    requiredConfirmationText,
    counts,
    deleted: {
      auditEvent: auditEvent.count,
      restoredMealCandidate: restoredMealCandidate.count,
      restoredMARCandidate: restoredMARCandidate.count,
      mealLog: mealLog.count,
      marLog: marLog.count,
      restorationBatch: restorationBatch.count,
    },
  };
}

const GLOBAL_NUKE_CONFIRMATION = "NUKE-ENTIRE-DB-CONFIRMED";

async function executeGlobalNuke(payload: GlobalNukePayload) {
  if (process.env.ENABLE_GLOBAL_NUKE_DB !== "true") {
    throw new OpsApiError(
      403,
      "GLOBAL_NUKE_DISABLED",
      "Global nuke is disabled. Set ENABLE_GLOBAL_NUKE_DB=true to enable.",
    );
  }

  const marLogModel = (prisma as any).mARLog ?? (prisma as any).marLog;
  if (!marLogModel) {
    throw new OpsApiError(500, "MAR_MODEL_UNAVAILABLE", "Prisma MARLog model is unavailable on this client.");
  }

  const apply = Boolean(payload.apply);
  const requiredConfirmationText = GLOBAL_NUKE_CONFIRMATION;

  const counts = {
    auditEvent: await prisma.auditEvent.count(),
    restoredMealCandidate: await prisma.restoredMealCandidate.count(),
    restoredMARCandidate: await prisma.restoredMARCandidate.count(),
    mealLog: await prisma.mealLog.count(),
    marLog: await marLogModel.count(),
    restorationBatch: await prisma.restorationBatch.count(),
    sleepSettlingLog: await prisma.sleepSettlingLog.count(),
    bglDiabetesLog: await prisma.bglDiabetesLog.count(),
    bowelFluidLog: await prisma.bowelFluidLog.count(),
    hygieneLog: await prisma.hygieneLog.count(),
    communityAccessQaLog: await prisma.communityAccessQaLog.count(),
    repositioningQaLog: await prisma.repositioningQaLog.count(),
    shiftNote: await prisma.shiftNote.count(),
    gapReport: await prisma.gapReport.count(),
  };

  if (!apply) {
    return { mode: "DRY_RUN" as const, requiredConfirmationText, counts };
  }

  if (payload.confirmationText !== requiredConfirmationText) {
    throw new OpsApiError(
      400,
      "CONFIRMATION_REQUIRED",
      "Global nuke apply requires exact confirmation text.",
      { requiredConfirmationText },
    );
  }

  const [
    auditEvent,
    restoredMealCandidate,
    restoredMARCandidate,
    mealLog,
    marLog,
    restorationBatch,
    sleepSettlingLog,
    bglDiabetesLog,
    bowelFluidLog,
    hygieneLog,
    communityAccessQaLog,
    repositioningQaLog,
    shiftNote,
    gapReport,
  ] = await prisma.$transaction([
    prisma.auditEvent.deleteMany(),
    prisma.restoredMealCandidate.deleteMany(),
    prisma.restoredMARCandidate.deleteMany(),
    prisma.mealLog.deleteMany(),
    marLogModel.deleteMany(),
    prisma.restorationBatch.deleteMany(),
    prisma.sleepSettlingLog.deleteMany(),
    prisma.bglDiabetesLog.deleteMany(),
    prisma.bowelFluidLog.deleteMany(),
    prisma.hygieneLog.deleteMany(),
    prisma.communityAccessQaLog.deleteMany(),
    prisma.repositioningQaLog.deleteMany(),
    prisma.shiftNote.deleteMany(),
    prisma.gapReport.deleteMany(),
  ]);

  return {
    mode: "APPLY" as const,
    requiredConfirmationText,
    counts,
    deleted: {
      auditEvent: auditEvent.count,
      restoredMealCandidate: restoredMealCandidate.count,
      restoredMARCandidate: restoredMARCandidate.count,
      mealLog: mealLog.count,
      marLog: marLog.count,
      restorationBatch: restorationBatch.count,
      sleepSettlingLog: sleepSettlingLog.count,
      bglDiabetesLog: bglDiabetesLog.count,
      bowelFluidLog: bowelFluidLog.count,
      hygieneLog: hygieneLog.count,
      communityAccessQaLog: communityAccessQaLog.count,
      repositioningQaLog: repositioningQaLog.count,
      shiftNote: shiftNote.count,
      gapReport: gapReport.count,
    },
  };
}

async function parseBody(request: NextRequest): Promise<UatPayload> {
  try {
    return (await request.json()) as UatPayload;
  } catch {
    throw new OpsApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireFullSession(request);
    const payload = await parseBody(request);

    if (payload.action === "stress") {
      const result = await executeStressRun(payload);
      const artifact = await writeArtifact("stress", result);
      return NextResponse.json({
        action: "stress",
        ok: result.pass,
        result,
        artifact,
      });
    }

    if (payload.action === "cleanup") {
      const result = await executeCleanup(payload);
      const artifact = await writeArtifact(result.mode === "APPLY" ? "cleanup-apply" : "cleanup-dry-run", result);
      return NextResponse.json({
        action: "cleanup",
        ok: true,
        result,
        artifact,
      });
    }

    if (payload.action === "global_nuke") {
      const result = await executeGlobalNuke(payload);
      const artifact = await writeArtifact(result.mode === "APPLY" ? "global-nuke-apply" : "global-nuke-dry-run", result);
      return NextResponse.json({
        action: "global_nuke",
        ok: true,
        result,
        artifact,
      });
    }

    throw new OpsApiError(400, "INVALID_ACTION", "Unsupported UAT action.");
  } catch (error) {
    if (error instanceof OpsApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details ?? null },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected UAT operation failure.",
        code: "UNEXPECTED_ERROR",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
