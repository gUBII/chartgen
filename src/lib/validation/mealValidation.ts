import { SwallowObservation } from "@prisma/client";

export interface ParticipantMealPlanSnapshot {
  defaultFoodTexture: number;
  defaultFluidThickness: number;
}

export interface MealEntry {
  foodTexture: number;
  fluidThickness: number;
  swallowingObservations: SwallowObservation[];
  deviationReason?: string | null;
  incidentReference?: string | null;
  participantPlan?: ParticipantMealPlanSnapshot;
}

const IDDSI_FOOD_TEXTURE_LEVELS = {
  MIN: 3,
  MAX: 7,
} as const;

const IDDSI_FLUID_THICKNESS_LEVELS = {
  MIN: 0,
  MAX: 4,
} as const;

const MIN_DEVIATION_REASON_LENGTH = 10;
const HIGH_RISK_OBSERVATIONS = new Set<SwallowObservation>([
  SwallowObservation.CHOKING,
  SwallowObservation.GAGGING,
]);

const isIntegerInRange = (value: number, min: number, max: number): boolean => {
  return Number.isInteger(value) && value >= min && value <= max;
};

/**
 * Validates a meal entry against IDDSI standards, plan deviations, and
 * swallowing observation constraints.
 *
 * @param entry The meal entry to validate.
 * @returns An object containing a boolean `isValid` and an array of `errors`.
 */
export const validateMealEntry = (entry: MealEntry): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isIntegerInRange(entry.foodTexture, IDDSI_FOOD_TEXTURE_LEVELS.MIN, IDDSI_FOOD_TEXTURE_LEVELS.MAX)) {
    errors.push(
      `Invalid food texture: ${entry.foodTexture}. Must be between ${IDDSI_FOOD_TEXTURE_LEVELS.MIN} and ${IDDSI_FOOD_TEXTURE_LEVELS.MAX}.`
    );
  }

  if (
    !isIntegerInRange(entry.fluidThickness, IDDSI_FLUID_THICKNESS_LEVELS.MIN, IDDSI_FLUID_THICKNESS_LEVELS.MAX)
  ) {
    errors.push(
      `Invalid fluid thickness: ${entry.fluidThickness}. Must be between ${IDDSI_FLUID_THICKNESS_LEVELS.MIN} and ${IDDSI_FLUID_THICKNESS_LEVELS.MAX}.`
    );
  }

  if (entry.swallowingObservations.length === 0) {
    errors.push('Swallowing observations must include "NONE" or at least one observed flag.');
  }

  const observationSet = new Set(entry.swallowingObservations);
  if (observationSet.size !== entry.swallowingObservations.length) {
    errors.push("Swallowing observations cannot contain duplicate values.");
  }

  const hasNone = entry.swallowingObservations.includes(SwallowObservation.NONE);
  if (hasNone && entry.swallowingObservations.length > 1) {
    errors.push('Invalid swallowing observations: If "NONE" is selected, no other observations can be present.');
  }

  const hasHighRiskObservation = entry.swallowingObservations.some((obs) => HIGH_RISK_OBSERVATIONS.has(obs));
  if (hasHighRiskObservation && !entry.incidentReference?.trim()) {
    errors.push("A high-risk swallowing observation requires an incident reference.");
  }

  const planDeviation =
    entry.participantPlan !== undefined &&
    (entry.foodTexture !== entry.participantPlan.defaultFoodTexture ||
      entry.fluidThickness !== entry.participantPlan.defaultFluidThickness);

  if (planDeviation && !entry.deviationReason?.trim()) {
    errors.push("Reason for deviation is required when IDDSI levels differ from the participant plan.");
  }

  if (
    entry.deviationReason &&
    entry.deviationReason.trim().length > 0 &&
    entry.deviationReason.trim().length < MIN_DEVIATION_REASON_LENGTH
  ) {
    errors.push(`Deviation reason must be at least ${MIN_DEVIATION_REASON_LENGTH} characters.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
