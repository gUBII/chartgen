/**
 * Personalization Engine
 *
 * Derives participant-specific baselines from historical meal and medication logs.
 * These baselines inform generator priors to create more realistic, person-specific outcomes.
 */

import { MealType, AmountEaten, MARStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export interface ParticipantBaselines {
  participantId: string;
  mealAdherence: {
    [key in MealType]?: number; // 0–1 success rate for that meal type
  };
  overallMealAdherence: number; // 0–1 across all meals
  medicationAdherence: number; // 0–1 (% administered vs. total)
  medicationRefusalRate: number; // 0–1 (% refused)
  medicationHeldRate: number; // 0–1 (% held/clinical)
  medianMealAdminOffsetMinutes: number; // How many min late on average
  medianMedicationAdminOffsetMinutes: number;
  dataPoints: {
    mealLogsAnalyzed: number;
    marLogsAnalyzed: number;
  };
}

const LOOKBACK_DAYS = 90; // Analyze last 90 days of history
const MIN_HISTORICAL_MEALS = 5; // Require at least this many to compute baseline
const MIN_HISTORICAL_MEDS = 5;

const DEFAULT_MEAL_SUCCESS_RATE = 0.89; // Fallback if no history
const DEFAULT_MAR_SUCCESS_RATE = 0.88;

const getHistoricalMealLogs = async (participantId: string): Promise<any[]> => {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  return prisma.mealLog.findMany({
    where: {
      participantId,
      timestamp: { gte: since }, // Use event time, not creation time
      source: { in: ["LIVE"] }, // Only real logs, not restored
    },
    orderBy: { timestamp: "asc" },
    select: {
      timestamp: true,
      mealType: true,
      amountEaten: true,
    },
  });
};

const getHistoricalMARLogs = async (participantId: string): Promise<any[]> => {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  return prisma.mARLog.findMany({
    where: {
      participantId,
      scheduledAdminTime: { gte: since }, // Use event time, not creation time
      source: { in: ["LIVE"] },
    },
    orderBy: { scheduledAdminTime: "asc" },
    select: {
      scheduledAdminTime: true,
      actualAdminTime: true,
      status: true,
    },
  });
};

const computeMealAdherence = (
  mealLogs: Array<{ mealType: MealType; amountEaten: AmountEaten }>
): {
  byType: { [key in MealType]?: number };
  overall: number;
} => {
  if (mealLogs.length === 0) {
    return { byType: {}, overall: DEFAULT_MEAL_SUCCESS_RATE };
  }

  const byType: { [key in MealType]?: number } = {};
  const typeCounts: { [key in MealType]?: { success: number; total: number } } = {};

  // Initialize counts for all meal types
  Object.values(MealType).forEach((mt) => {
    typeCounts[mt as MealType] = { success: 0, total: 0 };
  });

  for (const log of mealLogs) {
    const mt = log.mealType as MealType;
    if (!typeCounts[mt]) {
      typeCounts[mt] = { success: 0, total: 0 };
    }

    typeCounts[mt]!.total += 1;

    // Success = FIFTY or higher (50%+ eaten)
    const successAmounts = new Set([
      "FIFTY",
      "SEVENTY_FIVE",
      "ONE_HUNDRED",
    ]);
    if (successAmounts.has(log.amountEaten)) {
      typeCounts[mt]!.success += 1;
    }
  }

  // Compute by-type rates
  let totalSuccess = 0;
  for (const mt of Object.values(MealType)) {
    const counts = typeCounts[mt as MealType];
    if (counts && counts.total > 0) {
      byType[mt as MealType] = counts.success / counts.total;
      totalSuccess += counts.success;
    }
  }

  const overall = totalSuccess / mealLogs.length;
  return { byType, overall };
};

const computeMedicationAdherence = (
  marLogs: Array<{ status: MARStatus }>
): {
  administeredRate: number;
  refusalRate: number;
  heldRate: number;
} => {
  if (marLogs.length === 0) {
    return {
      administeredRate: DEFAULT_MAR_SUCCESS_RATE,
      refusalRate: 0.06,
      heldRate: 0.06,
    };
  }

  const administered = marLogs.filter((log) => log.status === "ADMINISTERED").length;
  const refused = marLogs.filter((log) => log.status === "REFUSED").length;
  const held = marLogs.filter((log) => log.status === "HELD").length;

  const total = marLogs.length;
  return {
    administeredRate: administered / total,
    refusalRate: refused / total,
    heldRate: held / total,
  };
};

const computeMedicationTimingOffset = (
  marLogs: Array<{ scheduledAdminTime: Date; actualAdminTime: Date }>
): number => {
  if (marLogs.length === 0) return 0;

  const offsets = marLogs.map((log) => {
    const offsetMs = log.actualAdminTime.getTime() - log.scheduledAdminTime.getTime();
    return offsetMs / (1000 * 60); // Convert to minutes
  });

  // Return median offset
  offsets.sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  return offsets.length % 2 !== 0 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2;
};

const computeMealTimingOffset = (
  mealLogs: Array<{ timestamp: Date }>
): number => {
  if (mealLogs.length === 0) return 0;

  // Note: MealLog.timestamp is the actual administration time.
  // Without a scheduled time, we approximate by looking at the distribution.
  // For now, return a conservative estimate (typical meal served within ±15 min of expected time).
  return 0; // Placeholder; would need scheduled times to compute properly
};

/**
 * Derive personalized baselines for a participant based on their historical logs.
 * If insufficient history, returns sensible defaults.
 */
export async function deriveParticipantBaselines(
  participantId: string
): Promise<ParticipantBaselines> {
  const [mealLogs, marLogs] = await Promise.all([
    getHistoricalMealLogs(participantId),
    getHistoricalMARLogs(participantId),
  ]);

  const mealAdherence =
    mealLogs.length >= MIN_HISTORICAL_MEALS
      ? computeMealAdherence(mealLogs)
      : { byType: {}, overall: DEFAULT_MEAL_SUCCESS_RATE };

  const marAdherence =
    marLogs.length >= MIN_HISTORICAL_MEDS
      ? computeMedicationAdherence(marLogs)
      : {
          administeredRate: DEFAULT_MAR_SUCCESS_RATE,
          refusalRate: 0.06,
          heldRate: 0.06,
        };

  const medianMealOffset = computeMealTimingOffset(mealLogs);
  const medianMAROffset = computeMedicationTimingOffset(marLogs);

  return {
    participantId,
    mealAdherence: mealAdherence.byType,
    overallMealAdherence: mealAdherence.overall,
    medicationAdherence: marAdherence.administeredRate,
    medicationRefusalRate: marAdherence.refusalRate,
    medicationHeldRate: marAdherence.heldRate,
    medianMealAdminOffsetMinutes: medianMealOffset,
    medianMedicationAdminOffsetMinutes: medianMAROffset,
    dataPoints: {
      mealLogsAnalyzed: mealLogs.length,
      marLogsAnalyzed: marLogs.length,
    },
  };
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Adjust a base success rate by the participant's historical adherence.
 * E.g. if participant historically has 75% meal adherence and base rate is 89%,
 * pull the adjusted rate toward 75%.
 */
export function adjustedSuccessRateForParticipant(
  baseRate: number,
  historicalRate: number,
  weight: number = 0.5
): number {
  // Blend: (1-w) * base + w * historical
  // weight=0.5 means 50/50 blend
  return (1 - weight) * baseRate + weight * historicalRate;
}
