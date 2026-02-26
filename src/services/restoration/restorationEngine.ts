import { createHash, randomInt } from "node:crypto";
import { AmountEaten, MARStatus, MealType, SwallowObservation } from "@prisma/client";
import { generateTemporalRealism, type TemporalRealismOptions } from "./temporalRealism";

const RNG_SCALE = 1_000_000;
const BASE_SUCCESS_RATE = 0.9;

type OutcomeBand = "SUCCESS" | "VARIANCE";
type ReviewStatus = "PENDING_SUPERVISOR_REVIEW";
type DayClass = "CHALLENGING" | "STABLE" | "STRONG";

type WeightedOption<T> = {
  value: T;
  weight: number;
};

export interface ParticipantPlanSnapshot {
  participantId: string;
  defaultFoodTexture: number;
  defaultFluidThickness: number;
}

export interface RestorationContext {
  restorationBatchId: string;
  generatedByStaffId: string;
  generatedAt?: Date;
}

export interface MealRestoreInput {
  scheduledTime: Date;
  mealType: MealType;
  targetVolumeMl: number;
}

export interface MedicationRestoreInput {
  scheduledAdminTime: Date;
  medicationName: string;
  dosage: string;
  route: string;
}

export interface RestoredMealCandidate {
  participantId: string;
  timestamp: Date;
  mealType: MealType;
  foodTexture: number;
  fluidThickness: number;
  volumeMl: number;
  amountEaten: AmountEaten;
  swallowingObservations: SwallowObservation[];
  deviationReason: string | null;
  reviewStatus: ReviewStatus;
  source: "RESTORED_CANDIDATE";
  restorationBatchId: string;
  generatedByStaffId: string;
  generatedAt: Date;
  provenanceHash: string;
}

export interface RestoredMARCandidate {
  participantId: string;
  scheduledAdminTime: Date;
  actualAdminTime: Date;
  medicationName: string;
  dosage: string;
  route: string;
  status: MARStatus;
  omissionReason: string | null;
  statusComment: string | null;
  reviewStatus: ReviewStatus;
  source: "RESTORED_CANDIDATE";
  restorationBatchId: string;
  generatedByStaffId: string;
  generatedAt: Date;
  provenanceHash: string;
}

const secureUnitRandom = (): number => {
  return randomInt(0, RNG_SCALE) / RNG_SCALE;
};

const seededUnitRandom = (seed: string): number => {
  const digest = createHash("sha256").update(seed).digest();
  const numerator = digest.readUIntBE(0, 6);
  return numerator / 2 ** 48;
};

const pickWeighted = <T>(options: WeightedOption<T>[]): T => {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  if (total <= 0) {
    throw new Error("Weighted distribution must have a positive total weight.");
  }

  const threshold = secureUnitRandom() * total;
  let running = 0;
  for (const option of options) {
    running += option.weight;
    if (threshold <= running) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
};

const pickArrayOption = <T>(options: readonly T[]): T => {
  if (options.length === 0) {
    throw new Error("Cannot pick from an empty option list.");
  }
  return options[randomInt(0, options.length)];
};

const hashPayload = (payload: object): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const pickOutcomeBand = (successRate: number): OutcomeBand => {
  return secureUnitRandom() <= successRate ? "SUCCESS" : "VARIANCE";
};

const roundVolume = (volume: number): number => {
  return Math.max(0, Math.round(volume));
};

const scaleVolume = (baseMl: number, multiplier: number): number => {
  return roundVolume(baseMl * multiplier);
};

const randomBetween = (min: number, max: number): number => {
  if (min >= max) {
    return min;
  }
  return min + secureUnitRandom() * (max - min);
};

const localDateKey = (value: Date): string => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const deriveDayProfile = (
  participantId: string,
  restorationBatchId: string,
  scheduledTime: Date
): { daySeed: number; dayClass: DayClass } => {
  const seed = seededUnitRandom(`${participantId}|${restorationBatchId}|${localDateKey(scheduledTime)}`);
  const dayClass: DayClass = seed < 0.18 ? "CHALLENGING" : seed > 0.84 ? "STRONG" : "STABLE";
  return { daySeed: seed, dayClass };
};

const pickRoundToMinutes = (): number => {
  return pickWeighted<number>([
    { value: 1, weight: 72 },
    { value: 5, weight: 28 },
  ]);
};

const AMOUNT_VOLUME_MULTIPLIER_BANDS: Record<AmountEaten, { min: number; max: number }> = {
  [AmountEaten.ZERO]: { min: 0, max: 0 },
  [AmountEaten.TWENTY_FIVE]: { min: 0.18, max: 0.34 },
  [AmountEaten.FIFTY]: { min: 0.43, max: 0.58 },
  [AmountEaten.SEVENTY_FIVE]: { min: 0.68, max: 0.84 },
  [AmountEaten.ONE_HUNDRED]: { min: 0.92, max: 1.07 },
  [AmountEaten.REFUSED]: { min: 0, max: 0 },
};

const volumeFromAmount = (targetVolumeMl: number, amountEaten: AmountEaten): number => {
  if (amountEaten === AmountEaten.REFUSED) {
    return 0;
  }
  const band = AMOUNT_VOLUME_MULTIPLIER_BANDS[amountEaten];
  return scaleVolume(targetVolumeMl, randomBetween(band.min, band.max));
};

const MEAL_TIMING_PROFILE: Record<MealType, { maxEarly: number; maxLate: number; lateBias: number }> = {
  [MealType.BREAKFAST]: { maxEarly: 10, maxLate: 16, lateBias: 0.58 },
  [MealType.LUNCH]: { maxEarly: 12, maxLate: 20, lateBias: 0.62 },
  [MealType.SNACK]: { maxEarly: 14, maxLate: 22, lateBias: 0.67 },
  [MealType.DINNER]: { maxEarly: 9, maxLate: 24, lateBias: 0.69 },
};

const buildMealTimingOptions = (
  mealType: MealType,
  dayProfile: { daySeed: number; dayClass: DayClass }
): TemporalRealismOptions => {
  const base = MEAL_TIMING_PROFILE[mealType];
  const operationalDrag = dayProfile.dayClass === "CHALLENGING" ? 1.28 : dayProfile.dayClass === "STRONG" ? 0.86 : 1;
  const seedLateNudge = (dayProfile.daySeed - 0.5) * 0.16;

  return {
    maxEarlyMinutes: Math.max(3, Math.round(base.maxEarly * (operationalDrag > 1 ? 0.88 : 1))),
    maxLateMinutes: Math.max(8, Math.round(base.maxLate * operationalDrag)),
    lateBias: clamp(
      base.lateBias + seedLateNudge + (dayProfile.dayClass === "CHALLENGING" ? 0.08 : 0),
      0.2,
      0.94
    ),
    roundToMinutes: pickRoundToMinutes(),
  };
};

type MarTimingMode = "ROUTINE" | "LATE" | "OMISSION";

const buildMarTimingOptions = (
  dayProfile: { daySeed: number; dayClass: DayClass },
  mode: MarTimingMode
): TemporalRealismOptions => {
  const byMode: Record<MarTimingMode, { maxEarly: number; maxLate: number; lateBias: number }> = {
    ROUTINE: { maxEarly: 8, maxLate: 14, lateBias: 0.6 },
    LATE: { maxEarly: 2, maxLate: 52, lateBias: 0.9 },
    OMISSION: { maxEarly: 3, maxLate: 24, lateBias: 0.74 },
  };
  const base = byMode[mode];
  const operationalDrag = dayProfile.dayClass === "CHALLENGING" ? 1.32 : dayProfile.dayClass === "STRONG" ? 0.9 : 1;
  const seedLateNudge = (dayProfile.daySeed - 0.5) * 0.14;

  return {
    maxEarlyMinutes: Math.max(1, Math.round(base.maxEarly * (mode === "LATE" ? 1 : 0.95))),
    maxLateMinutes: Math.max(6, Math.round(base.maxLate * operationalDrag)),
    lateBias: clamp(base.lateBias + seedLateNudge + (dayProfile.dayClass === "CHALLENGING" ? 0.07 : 0), 0.2, 0.97),
    roundToMinutes: pickRoundToMinutes(),
  };
};

type MealVarianceScenario = "LOW_APPETITE" | "PARTICIPANT_REFUSAL" | "SWALLOW_CONCERN" | "TEXTURE_SUBSTITUTION";

const MEAL_VARIANCE_REASON_OPTIONS: Record<MealVarianceScenario, readonly string[]> = {
  LOW_APPETITE: [
    "Lower intake than usual due to reduced appetite.",
    "Reduced appetite noted; intake lower than expected.",
    "Meal intake declined after reporting feeling full early.",
  ],
  PARTICIPANT_REFUSAL: [
    "Participant declined meal after prompting.",
    "Participant refused meal despite encouragement.",
    "Meal was declined after two prompts and reassurance.",
  ],
  SWALLOW_CONCERN: [
    "Meal paused due to coughing; escalated for follow-up.",
    "Swallow concern observed and meal paused for clinical review.",
    "Intake stopped after swallow difficulty signs were observed.",
  ],
  TEXTURE_SUBSTITUTION: [
    "Temporary texture substitution pending stock replacement.",
    "Texture adjusted temporarily to maintain safe intake.",
    "Alternate texture used due to temporary stock limitation.",
  ],
};

const pickMealVarianceReason = (scenario: MealVarianceScenario): string => {
  return pickArrayOption(MEAL_VARIANCE_REASON_OPTIONS[scenario]);
};

const MAR_REFUSAL_REASONS = [
  "Participant refused medication after prompting.",
  "Medication declined after explanation and prompt.",
  "Participant chose not to take medication at this round.",
] as const;

const MAR_HELD_REASONS = [
  "Medication held pending clinical review.",
  "Dose held while awaiting clinical direction.",
  "Administration withheld until clinician confirmation.",
] as const;

const MAR_HELD_COMMENTS = [
  "Clinical hold recorded and escalation completed.",
  "Held per precautionary review workflow.",
  "Medication held and documented for follow-up.",
] as const;

const MAR_LATE_COMMENTS = [
  "Late administration due to routine interruption.",
  "Dose administered late following competing care priorities.",
  "Administration delayed by workflow interruption.",
] as const;

export class RestorationEngine {
  restoreMealCandidate(
    plan: ParticipantPlanSnapshot,
    input: MealRestoreInput,
    context: RestorationContext
  ): RestoredMealCandidate {
    const dayProfile = deriveDayProfile(plan.participantId, context.restorationBatchId, input.scheduledTime);
    const mealSuccessRate = clamp(
      ({
        [MealType.BREAKFAST]: 0.92,
        [MealType.LUNCH]: 0.89,
        [MealType.SNACK]: 0.91,
        [MealType.DINNER]: 0.88,
      }[input.mealType] +
        (dayProfile.dayClass === "CHALLENGING" ? -0.13 : dayProfile.dayClass === "STRONG" ? 0.04 : 0)),
      0.66,
      0.97
    );
    const outcome = pickOutcomeBand(mealSuccessRate);
    const generatedAt = context.generatedAt ?? new Date();

    let amountEaten: AmountEaten;
    let swallowingObservations: SwallowObservation[];
    let volumeMl: number;
    let deviationReason: string | null = null;
    let foodTexture = plan.defaultFoodTexture;
    let fluidThickness = plan.defaultFluidThickness;

    if (outcome === "SUCCESS") {
      const successAmountOptions =
        dayProfile.dayClass === "CHALLENGING"
          ? [
              { value: AmountEaten.ONE_HUNDRED, weight: 42 },
              { value: AmountEaten.SEVENTY_FIVE, weight: 40 },
              { value: AmountEaten.FIFTY, weight: 18 },
            ]
          : dayProfile.dayClass === "STRONG"
            ? [
                { value: AmountEaten.ONE_HUNDRED, weight: 67 },
                { value: AmountEaten.SEVENTY_FIVE, weight: 27 },
                { value: AmountEaten.FIFTY, weight: 6 },
              ]
            : [
                { value: AmountEaten.ONE_HUNDRED, weight: 56 },
                { value: AmountEaten.SEVENTY_FIVE, weight: 34 },
                { value: AmountEaten.FIFTY, weight: 10 },
              ];
      amountEaten = pickWeighted<AmountEaten>(successAmountOptions);
      swallowingObservations = pickWeighted<SwallowObservation[]>([
        { value: [SwallowObservation.NONE], weight: dayProfile.dayClass === "CHALLENGING" ? 86 : 93 },
        { value: [SwallowObservation.MULTIPLE_SWALLOWS], weight: dayProfile.dayClass === "CHALLENGING" ? 9 : 5 },
        { value: [SwallowObservation.THROAT_CLEARING], weight: dayProfile.dayClass === "CHALLENGING" ? 5 : 2 },
      ]);
      volumeMl = volumeFromAmount(input.targetVolumeMl, amountEaten);
    } else {
      const scenario = pickWeighted<MealVarianceScenario>(
        dayProfile.dayClass === "CHALLENGING"
          ? [
              { value: "LOW_APPETITE", weight: 46 },
              { value: "PARTICIPANT_REFUSAL", weight: 29 },
              { value: "SWALLOW_CONCERN", weight: 18 },
              { value: "TEXTURE_SUBSTITUTION", weight: 7 },
            ]
          : dayProfile.dayClass === "STRONG"
            ? [
                { value: "LOW_APPETITE", weight: 30 },
                { value: "PARTICIPANT_REFUSAL", weight: 18 },
                { value: "SWALLOW_CONCERN", weight: 17 },
                { value: "TEXTURE_SUBSTITUTION", weight: 35 },
              ]
            : [
                { value: "LOW_APPETITE", weight: 35 },
                { value: "PARTICIPANT_REFUSAL", weight: 25 },
                { value: "SWALLOW_CONCERN", weight: 25 },
                { value: "TEXTURE_SUBSTITUTION", weight: 15 },
              ]
      );

      switch (scenario) {
        case "LOW_APPETITE":
          amountEaten = pickWeighted<AmountEaten>([
            { value: AmountEaten.FIFTY, weight: 75 },
            { value: AmountEaten.TWENTY_FIVE, weight: 25 },
          ]);
          swallowingObservations = pickWeighted<SwallowObservation[]>([
            { value: [SwallowObservation.NONE], weight: 82 },
            { value: [SwallowObservation.MULTIPLE_SWALLOWS], weight: 18 },
          ]);
          volumeMl = volumeFromAmount(input.targetVolumeMl, amountEaten);
          deviationReason = pickMealVarianceReason("LOW_APPETITE");
          break;
        case "PARTICIPANT_REFUSAL":
          amountEaten = AmountEaten.REFUSED;
          swallowingObservations = [SwallowObservation.NONE];
          volumeMl = 0;
          deviationReason = pickMealVarianceReason("PARTICIPANT_REFUSAL");
          break;
        case "SWALLOW_CONCERN":
          amountEaten = pickWeighted<AmountEaten>([
            { value: AmountEaten.TWENTY_FIVE, weight: 78 },
            { value: AmountEaten.ZERO, weight: 22 },
          ]);
          swallowingObservations = pickWeighted<SwallowObservation[]>([
            { value: [SwallowObservation.COUGHING], weight: 70 },
            { value: [SwallowObservation.THROAT_CLEARING], weight: 30 },
          ]);
          volumeMl = volumeFromAmount(input.targetVolumeMl, amountEaten);
          deviationReason = pickMealVarianceReason("SWALLOW_CONCERN");
          break;
        case "TEXTURE_SUBSTITUTION":
        default:
          amountEaten = AmountEaten.SEVENTY_FIVE;
          swallowingObservations = [SwallowObservation.NONE];
          volumeMl = volumeFromAmount(input.targetVolumeMl, amountEaten);
          foodTexture = Math.max(
            3,
            Math.min(
              7,
              plan.defaultFoodTexture +
                pickWeighted<number>([
                  { value: -1, weight: 78 },
                  { value: 1, weight: 22 },
                ])
            )
          );
          fluidThickness = plan.defaultFluidThickness;
          deviationReason = pickMealVarianceReason("TEXTURE_SUBSTITUTION");
          break;
      }
    }

    const timestamp = generateTemporalRealism(
      input.scheduledTime,
      buildMealTimingOptions(input.mealType, dayProfile)
    );

    const candidate: RestoredMealCandidate = {
      participantId: plan.participantId,
      timestamp,
      mealType: input.mealType,
      foodTexture,
      fluidThickness,
      volumeMl,
      amountEaten,
      swallowingObservations,
      deviationReason,
      reviewStatus: "PENDING_SUPERVISOR_REVIEW",
      source: "RESTORED_CANDIDATE",
      restorationBatchId: context.restorationBatchId,
      generatedByStaffId: context.generatedByStaffId,
      generatedAt,
      provenanceHash: "",
    };

    candidate.provenanceHash = hashPayload({
      participantId: candidate.participantId,
      timestamp: candidate.timestamp.toISOString(),
      mealType: candidate.mealType,
      foodTexture: candidate.foodTexture,
      fluidThickness: candidate.fluidThickness,
      volumeMl: candidate.volumeMl,
      amountEaten: candidate.amountEaten,
      swallowingObservations: candidate.swallowingObservations,
      deviationReason: candidate.deviationReason,
      restorationBatchId: candidate.restorationBatchId,
      generatedByStaffId: candidate.generatedByStaffId,
      generatedAt: candidate.generatedAt.toISOString(),
    });

    return candidate;
  }

  restoreMedicationCandidate(
    _plan: ParticipantPlanSnapshot,
    input: MedicationRestoreInput,
    context: RestorationContext
  ): RestoredMARCandidate {
    const dayProfile = deriveDayProfile(_plan.participantId, context.restorationBatchId, input.scheduledAdminTime);
    const outcome = pickOutcomeBand(
      clamp(
        BASE_SUCCESS_RATE + (dayProfile.dayClass === "CHALLENGING" ? -0.14 : dayProfile.dayClass === "STRONG" ? 0.03 : 0),
        0.68,
        0.97
      )
    );
    const generatedAt = context.generatedAt ?? new Date();

    let status: MARStatus;
    let omissionReason: string | null = null;
    let statusComment: string | null = null;
    let actualAdminTime: Date;

    if (outcome === "SUCCESS") {
      status = MARStatus.ADMINISTERED;
      actualAdminTime = generateTemporalRealism(input.scheduledAdminTime, buildMarTimingOptions(dayProfile, "ROUTINE"));
    } else {
      const scenario = pickWeighted<"REFUSED" | "HELD_CLINICAL" | "LATE_ADMIN">([
        ...(dayProfile.dayClass === "CHALLENGING"
          ? [
              { value: "REFUSED" as const, weight: 49 },
              { value: "HELD_CLINICAL" as const, weight: 32 },
              { value: "LATE_ADMIN" as const, weight: 19 },
            ]
          : dayProfile.dayClass === "STRONG"
            ? [
                { value: "REFUSED" as const, weight: 37 },
                { value: "HELD_CLINICAL" as const, weight: 20 },
                { value: "LATE_ADMIN" as const, weight: 43 },
              ]
            : [
                { value: "REFUSED" as const, weight: 45 },
                { value: "HELD_CLINICAL" as const, weight: 25 },
                { value: "LATE_ADMIN" as const, weight: 30 },
              ]),
      ]);

      if (scenario === "LATE_ADMIN") {
        status = MARStatus.ADMINISTERED;
        actualAdminTime = generateTemporalRealism(input.scheduledAdminTime, buildMarTimingOptions(dayProfile, "LATE"));
        statusComment = pickArrayOption(MAR_LATE_COMMENTS);
      } else if (scenario === "REFUSED") {
        status = MARStatus.REFUSED;
        actualAdminTime = generateTemporalRealism(input.scheduledAdminTime, buildMarTimingOptions(dayProfile, "OMISSION"));
        omissionReason = pickArrayOption(MAR_REFUSAL_REASONS);
      } else {
        status = MARStatus.HELD;
        actualAdminTime = generateTemporalRealism(input.scheduledAdminTime, buildMarTimingOptions(dayProfile, "OMISSION"));
        omissionReason = pickArrayOption(MAR_HELD_REASONS);
        statusComment = pickArrayOption(MAR_HELD_COMMENTS);
      }
    }

    const candidate: RestoredMARCandidate = {
      participantId: _plan.participantId,
      scheduledAdminTime: input.scheduledAdminTime,
      actualAdminTime,
      medicationName: input.medicationName,
      dosage: input.dosage,
      route: input.route,
      status,
      omissionReason,
      statusComment,
      reviewStatus: "PENDING_SUPERVISOR_REVIEW",
      source: "RESTORED_CANDIDATE",
      restorationBatchId: context.restorationBatchId,
      generatedByStaffId: context.generatedByStaffId,
      generatedAt,
      provenanceHash: "",
    };

    candidate.provenanceHash = hashPayload({
      participantId: candidate.participantId,
      scheduledAdminTime: candidate.scheduledAdminTime.toISOString(),
      actualAdminTime: candidate.actualAdminTime.toISOString(),
      medicationName: candidate.medicationName,
      dosage: candidate.dosage,
      route: candidate.route,
      status: candidate.status,
      omissionReason: candidate.omissionReason,
      statusComment: candidate.statusComment,
      restorationBatchId: candidate.restorationBatchId,
      generatedByStaffId: candidate.generatedByStaffId,
      generatedAt: candidate.generatedAt.toISOString(),
    });

    return candidate;
  }
}
