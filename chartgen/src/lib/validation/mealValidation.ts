import { SwallowObservation } from "@prisma/client";

// --- Type Definitions ---

export interface MealEntry {
  foodTexture: number;
  fluidThickness: number;
  swallowingObservations: SwallowObservation[];
}

// --- IDDSI Level Constants ---

const IDDSI_FOOD_TEXTURE_LEVELS = {
  MIN: 3,
  MAX: 7,
};

const IDDSI_FLUID_THICKNESS_LEVELS = {
  MIN: 0,
  MAX: 4,
};

// --- Validation Logic ---

/**
 * Validates a meal entry against IDDSI standards and swallowing observation constraints.
 *
 * @param entry The meal entry to validate.
 * @returns An object containing a boolean `isValid` and an array of `errors`.
 */
export const validateMealEntry = (entry: MealEntry): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 1. Validate Food Texture
  if (
    entry.foodTexture < IDDSI_FOOD_TEXTURE_LEVELS.MIN ||
    entry.foodTexture > IDDSI_FOOD_TEXTURE_LEVELS.MAX
  ) {
    errors.push(
      `Invalid food texture: ${entry.foodTexture}. Must be between ${IDDSI_FOOD_TEXTURE_LEVELS.MIN} and ${IDDSI_FOOD_TEXTURE_LEVELS.MAX}.`
    );
  }

  // 2. Validate Fluid Thickness
  if (
    entry.fluidThickness < IDDSI_FLUID_THICKNESS_LEVELS.MIN ||
    entry.fluidThickness > IDDSI_FLUID_THICKNESS_LEVELS.MAX
  ) {
    errors.push(
      `Invalid fluid thickness: ${entry.fluidThickness}. Must be between ${IDDSI_FLUID_THICKNESS_LEVELS.MIN} and ${IDDSI_FLUID_THICKNESS_LEVELS.MAX}.`
    );
  }

  // 3. Validate Swallowing Observations
  const hasNone = entry.swallowingObservations.includes(SwallowObservation.NONE);
  if (hasNone && entry.swallowingObservations.length > 1) {
    errors.push('Invalid swallowing observations: If "NONE" is selected, no other observations can be present.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// --- Example Usage ---
/*
const validEntry: MealEntry = {
  foodTexture: 5,
  fluidThickness: 2,
  swallowingObservations: [SwallowObservation.COUGHING],
};

const invalidTextureEntry: MealEntry = {
  foodTexture: 8, // Invalid
  fluidThickness: 2,
  swallowingObservations: [],
};

const invalidSwallowingObsEntry: MealEntry = {
  foodTexture: 4,
  fluidThickness: 1,
  swallowingObservations: [SwallowObservation.NONE, SwallowObservation.CHOKING], // Invalid
};

console.log('Valid Entry:', validateMealEntry(validEntry));
// { isValid: true, errors: [] }

console.log('Invalid Texture Entry:', validateMealEntry(invalidTextureEntry));
// { isValid: false, errors: ['Invalid food texture: 8. Must be between 3 and 7.'] }

console.log('Invalid Swallowing Obs Entry:', validateMealEntry(invalidSwallowingObsEntry));
// { isValid: false, errors: ['Invalid swallowing observations: If "NONE" is selected, no other observations can be present.'] }
*/
