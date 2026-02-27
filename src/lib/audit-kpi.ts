import { MARStatus } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditKpiResult = {
  window: { from: string; to: string };
  totals: {
    committedMealLogs: number;
    committedMarLogs: number;
    auditEvents: number;
  };
  gaps: {
    missingEvidence: number;
    continuityIssues: number;
    exceptionWithoutFollowup: number;
    provenanceWarnings: number;
  };
  readiness: {
    overallScore: number;
    marScore: number;
    mealtimeScore: number;
  };
  severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  trends: Array<{
    date: string;
    missingEvidence: number;
    continuityIssues: number;
    exceptions: number;
  }>;
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function scoreToBand(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 75) return "low";
  if (score >= 55) return "medium";
  if (score >= 35) return "high";
  return "critical";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

const MAR_EXCEPTION_STATUSES = new Set<MARStatus>([
  MARStatus.REFUSED,
  MARStatus.HELD,
  MARStatus.NOT_ADMINISTERED,
  MARStatus.LATE,
]);

function isMarException(status: MARStatus): boolean {
  return MAR_EXCEPTION_STATUSES.has(status);
}

export async function computeAuditKpi(from: Date, to: Date): Promise<AuditKpiResult> {
  const [mealLogs, marLogs, auditEvents] = await Promise.all([
    prisma.mealLog.findMany({
      where: { source: "RESTORED_APPROVED", timestamp: { gte: from, lte: to } },
      select: {
        id: true,
        timestamp: true,
        amountEaten: true,
        deviationReason: true,
        provenanceHash: true,
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.mARLog.findMany({
      where: { source: "RESTORED_APPROVED", scheduledAdminTime: { gte: from, lte: to } },
      select: {
        id: true,
        scheduledAdminTime: true,
        actualAdminTime: true,
        status: true,
        omissionReason: true,
        provenanceHash: true,
      },
      orderBy: { scheduledAdminTime: "asc" },
    }),
    prisma.auditEvent.count({
      where: { createdAt: { gte: from, lte: to } },
    }),
  ]);

  const mealMissing = mealLogs.filter(
    (log) => (log.amountEaten === "REFUSED" || log.amountEaten === "ZERO") && !log.deviationReason,
  ).length;
  const marMissing = marLogs.filter(
    (log) => isMarException(log.status) && !log.omissionReason,
  ).length;
  const missingEvidence = mealMissing + marMissing;

  const marContinuity = marLogs.filter((log) => {
    const deltaMin = (log.actualAdminTime.getTime() - log.scheduledAdminTime.getTime()) / 60000;
    return deltaMin < -90 || deltaMin > 8 * 60;
  }).length;

  const mealContinuity = mealLogs.reduce((count, current, index, arr) => {
    if (index === 0) return count;
    const prev = arr[index - 1];
    const deltaMin = (current.timestamp.getTime() - prev.timestamp.getTime()) / 60000;
    if (deltaMin < 5) return count + 1;
    return count;
  }, 0);
  const continuityIssues = marContinuity + mealContinuity;

  const marExceptions = marLogs.filter((log) => isMarException(log.status)).length;
  const mealExceptions = mealLogs.filter((log) => log.amountEaten === "REFUSED" || log.amountEaten === "ZERO").length;
  const exceptionWithoutFollowup = Math.max(0, marExceptions + mealExceptions - (marLogs.length + mealLogs.length) * 0.15);

  const provenanceWarnings =
    mealLogs.filter((log) => !log.provenanceHash || log.provenanceHash.length < 32).length +
    marLogs.filter((log) => !log.provenanceHash || log.provenanceHash.length < 32).length;

  const marRiskPenalty = marMissing * 3 + marContinuity * 3 + provenanceWarnings * 2;
  const mealRiskPenalty = mealMissing * 3 + mealContinuity * 3 + provenanceWarnings * 2;
  const marScore = clampScore(100 - marRiskPenalty);
  const mealtimeScore = clampScore(100 - mealRiskPenalty);
  const overallScore = clampScore(
    100 - (missingEvidence * 2 + continuityIssues * 3 + exceptionWithoutFollowup * 2 + provenanceWarnings * 4),
  );

  const severity = { low: 0, medium: 0, high: 0, critical: 0 };
  [overallScore, marScore, mealtimeScore].forEach((score) => {
    const band = scoreToBand(score);
    severity[band] += 1;
  });

  const trendMap = new Map<string, { missingEvidence: number; continuityIssues: number; exceptions: number }>();
  for (const log of mealLogs) {
    const key = toDayKey(log.timestamp);
    const prev = trendMap.get(key) ?? { missingEvidence: 0, continuityIssues: 0, exceptions: 0 };
    if ((log.amountEaten === "REFUSED" || log.amountEaten === "ZERO") && !log.deviationReason) {
      prev.missingEvidence += 1;
    }
    if (log.amountEaten === "REFUSED" || log.amountEaten === "ZERO") {
      prev.exceptions += 1;
    }
    trendMap.set(key, prev);
  }
  for (const log of marLogs) {
    const key = toDayKey(log.scheduledAdminTime);
    const prev = trendMap.get(key) ?? { missingEvidence: 0, continuityIssues: 0, exceptions: 0 };
    if (isMarException(log.status) && !log.omissionReason) {
      prev.missingEvidence += 1;
    }
    const deltaMin = (log.actualAdminTime.getTime() - log.scheduledAdminTime.getTime()) / 60000;
    if (deltaMin < -90 || deltaMin > 8 * 60) {
      prev.continuityIssues += 1;
    }
    if (isMarException(log.status)) {
      prev.exceptions += 1;
    }
    trendMap.set(key, prev);
  }

  return {
    window: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      committedMealLogs: mealLogs.length,
      committedMarLogs: marLogs.length,
      auditEvents,
    },
    gaps: {
      missingEvidence,
      continuityIssues,
      exceptionWithoutFollowup: Math.round(exceptionWithoutFollowup),
      provenanceWarnings,
    },
    readiness: {
      overallScore,
      marScore,
      mealtimeScore,
    },
    severity,
    trends: [...trendMap.entries()]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14),
  };
}
