import type { AmountEaten } from "@prisma/client";

export type CandidateRow = {
  id: string;
  timestamp: string;
  mealType: string;
  foodTexture: number;
  fluidThickness: number;
  volumeMl: number;
  amountEaten: AmountEaten;
  deviationReason: string | null;
  status: string;
  provenanceHash: string;
  dirty?: boolean;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ChartLog = Record<string, unknown>;

export type ActiveTab = "medication" | "nutrition" | "night" | "health";

export const AMOUNT_EATEN_OPTIONS: AmountEaten[] = [
  "ZERO",
  "TWENTY_FIVE",
  "FIFTY",
  "SEVENTY_FIVE",
  "ONE_HUNDRED",
  "REFUSED",
];

export const TAB_LABELS: Array<{ id: ActiveTab; label: string }> = [
  { id: "medication", label: "Medication (MAR)" },
  { id: "nutrition", label: "Nutrition & Bowel" },
  { id: "night", label: "Night Routine" },
  { id: "health", label: "Health & Vitals" },
];
