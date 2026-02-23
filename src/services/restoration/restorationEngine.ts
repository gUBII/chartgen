import { createHash, randomInt } from "node:crypto";
import { AmountEaten, MARStatus, MealType, SwallowObservation } from "@prisma/client";
import { generateTemporalRealism } from "./temporalRealism";

const RNG_SCALE = 1_000_000;
const SUCCESS_RATE = 0.9;

type OutcomeBand = "SUCCESS" | "VARIANCE";
type ReviewStatus = "PENDING_SUPERVISOR_REVIEW";

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

const hashPayload = (payload: object): string => {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const pickOutcomeBand = (): OutcomeBand => {
  return secureUnitRandom() <= SUCCESS_RATE ? "SUCCESS" : "VARIANCE";
};

const roundVolume = (volume: number): number => {
  return Math.max(0, Math.round(volume));
};

const scaleVolume = (baseMl: number, multiplier: number): number => {
  return roundVolume(baseMl * multiplier);
};

export class RestorationEngine {
  restoreMealCandidate(
    plan: ParticipantPlanSnapshot,
    input: MealRestoreInput,
    context: RestorationContext
  ): RestoredMealCandidate {
    const outcome = pickOutcomeBand();
    const generatedAt = context.generatedAt ?? new Date();

    let amountEaten: AmountEaten;
    let swallowingObservations: SwallowObservation[];
    let volumeMl: number;
    let deviationReason: string | null = null;
    let foodTexture = plan.defaultFoodTexture;
    let fluidThickness = plan.defaultFluidThickness;

    if (outcome === "SUCCESS") {
      amountEaten = pickWeighted<AmountEaten>([
        { value: AmountEaten.ONE_HUNDRED, weight: 56 },
        { value: AmountEaten.SEVENTY_FIVE, weight: 34 },
        { value: AmountEaten.FIFTY, weight: 10 },
      ]);
      swallowingObservations = pickWeighted<SwallowObservation[]>([
        { value: [SwallowObservation.NONE], weight: 93 },
        { value: [SwallowObservation.MULTIPLE_SWALLOWS], weight: 5 },
        { value: [SwallowObservation.THROAT_CLEARING], weight: 2 },
      ]);
      volumeMl = scaleVolume(input.targetVolumeMl, pickWeighted<number>([
        { value: 0.9, weight: 10 },
        { value: 1.0, weight: 70 },
        { value: 1.1, weight: 20 },
      ]));
    } else {
      const scenario = pickWeighted<
        | "LOW_APPETITE"
        | "PARTICIPANT_REFUSAL"
        | "SWALLOW_CONCERN"
        | "TEXTURE_SUBSTITUTION"
      >([
        { value: "LOW_APPETITE", weight: 35 },
        { value: "PARTICIPANT_REFUSAL", weight: 25 },
        { value: "SWALLOW_CONCERN", weight: 25 },
        { value: "TEXTURE_SUBSTITUTION", weight: 15 },
      ]);

      switch (scenario) {
        case "LOW_APPETITE":
          amountEaten = AmountEaten.FIFTY;
          swallowingObservations = [SwallowObservation.NONE];
          volumeMl = scaleVolume(input.targetVolumeMl, 0.55);
          deviationReason = "Lower intake than usual due to reduced appetite.";
          break;
        case "PARTICIPANT_REFUSAL":
          amountEaten = AmountEaten.REFUSED;
          swallowingObservations = [SwallowObservation.NONE];
          volumeMl = 0;
          deviationReason = "Participant declined meal after prompting.";
          break;
        case "SWALLOW_CONCERN":
          amountEaten = AmountEaten.TWENTY_FIVE;
          swallowingObservations = [SwallowObservation.COUGHING];
          volumeMl = scaleVolume(input.targetVolumeMl, 0.3);
          deviationReason = "Meal paused due to coughing; escalated for follow-up.";
          break;
        case "TEXTURE_SUBSTITUTION":
        default:
          amountEaten = AmountEaten.SEVENTY_FIVE;
          swallowingObservations = [SwallowObservation.NONE];
          volumeMl = scaleVolume(input.targetVolumeMl, 0.8);
          foodTexture = Math.max(3, Math.min(7, plan.defaultFoodTexture - 1));
          fluidThickness = plan.defaultFluidThickness;
          deviationReason = "Temporary texture substitution pending stock replacement.";
          break;
      }
    }

    const timestamp = generateTemporalRealism(input.scheduledTime, {
      maxEarlyMinutes: 12,
      maxLateMinutes: 18,
      lateBias: 0.62,
      roundToMinutes: 1,
    });

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
    const outcome = pickOutcomeBand();
    const generatedAt = context.generatedAt ?? new Date();

    let status: MARStatus;
    let omissionReason: string | null = null;
    let statusComment: string | null = null;
    let actualAdminTime: Date;

    if (outcome === "SUCCESS") {
      status = MARStatus.ADMINISTERED;
      actualAdminTime = generateTemporalRealism(input.scheduledAdminTime, {
        maxEarlyMinutes: 8,
        maxLateMinutes: 14,
        lateBias: 0.6,
        roundToMinutes: 1,
      });
    } else {
      const scenario = pickWeighted<"REFUSED" | "HELD_CLINICAL" | "LATE_ADMIN">([
        { value: "REFUSED", weight: 45 },
        { value: "HELD_CLINICAL", weight: 25 },
        { value: "LATE_ADMIN", weight: 30 },
      ]);

      if (scenario === "LATE_ADMIN") {
        status = MARStatus.ADMINISTERED;
        actualAdminTime = generateTemporalRealism(input.scheduledAdminTime, {
          maxEarlyMinutes: 2,
          maxLateMinutes: 45,
          lateBias: 0.92,
          roundToMinutes: 1,
        });
        statusComment = "Late administration due to routine interruption.";
      } else {
        status = MARStatus.REFUSED;
        actualAdminTime = input.scheduledAdminTime;
        omissionReason =
          scenario === "REFUSED"
            ? "Participant refused medication after prompting."
            : "Medication held pending clinical review.";
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
