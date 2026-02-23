import { randomInt } from "node:crypto";

const DEFAULT_VARIANCE_MINUTES = 15;
const RNG_SCALE = 1_000_000;

export interface TemporalRealismOptions {
  maxEarlyMinutes?: number;
  maxLateMinutes?: number;
  lateBias?: number;
  roundToMinutes?: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const secureUnitRandom = (): number => {
  return randomInt(0, RNG_SCALE) / RNG_SCALE;
};

// Triangular sampling produces less-extreme values than uniform random and can be skewed.
const sampleTriangular = (min: number, mode: number, max: number): number => {
  if (min === max) {
    return min;
  }

  const boundedMode = clamp(mode, min, max);
  const u = secureUnitRandom();
  const c = (boundedMode - min) / (max - min);

  if (u <= c) {
    return min + Math.sqrt(u * (max - min) * (boundedMode - min));
  }

  return max - Math.sqrt((1 - u) * (max - min) * (max - boundedMode));
};

/**
 * Generates a more human-like admin timestamp around the scheduled time.
 * The distribution is intentionally slightly late-biased by default and rounded
 * to reduce synthetic-looking millisecond patterns.
 */
export const generateTemporalRealism = (
  scheduledTime: Date,
  options: TemporalRealismOptions = {}
): Date => {
  const maxEarlyMinutes = Math.max(1, Math.floor(options.maxEarlyMinutes ?? DEFAULT_VARIANCE_MINUTES));
  const maxLateMinutes = Math.max(1, Math.floor(options.maxLateMinutes ?? DEFAULT_VARIANCE_MINUTES));
  const lateBias = clamp(options.lateBias ?? 0.58, 0.05, 0.95);
  const roundToMinutes = Math.max(1, Math.floor(options.roundToMinutes ?? 1));

  const min = -maxEarlyMinutes;
  const max = maxLateMinutes;
  const mode = min + (max - min) * lateBias;
  const deltaMinutes = sampleTriangular(min, mode, max);

  const shiftedMs = scheduledTime.getTime() + deltaMinutes * 60 * 1000;
  const roundingMs = roundToMinutes * 60 * 1000;
  const roundedMs = Math.round(shiftedMs / roundingMs) * roundingMs;

  return new Date(roundedMs);
};
