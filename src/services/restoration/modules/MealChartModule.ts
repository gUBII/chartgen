import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type AmountEaten = "ZERO" | "TWENTY_FIVE" | "FIFTY" | "SEVENTY_FIVE" | "ONE_HUNDRED" | "REFUSED";
type SwallowObservation =
  | "NONE"
  | "COUGHING"
  | "GAGGING"
  | "CHOKING"
  | "WATERY_EYES"
  | "MULTIPLE_SWALLOWS"
  | "THROAT_CLEARING";

const MEAL_SCHEDULE: Array<{ mealType: MealType; hour: number; minute: number; targetVolumeMl: number }> = [
  { mealType: "BREAKFAST", hour: 8, minute: 0, targetVolumeMl: 260 },
  { mealType: "LUNCH", hour: 12, minute: 30, targetVolumeMl: 360 },
  { mealType: "SNACK", hour: 15, minute: 30, targetVolumeMl: 180 },
  { mealType: "DINNER", hour: 18, minute: 0, targetVolumeMl: 420 },
];

const VOLUME_BANDS: Record<Exclude<AmountEaten, "REFUSED">, { min: number; max: number }> = {
  ZERO: { min: 0, max: 0 },
  TWENTY_FIVE: { min: 0.2, max: 0.36 },
  FIFTY: { min: 0.44, max: 0.6 },
  SEVENTY_FIVE: { min: 0.68, max: 0.84 },
  ONE_HUNDRED: { min: 0.92, max: 1.05 },
};

const toLocalDate = (value: Date): string => value.toISOString().slice(0, 10);

export class MealChartModule implements ChartModule {
  readonly type = "MEAL";

  buildSchedule(day: DayContext): ScheduledTask[] {
    return MEAL_SCHEDULE.map((template, index) => {
      const scheduledAt = new Date(day.date);
      scheduledAt.setHours(template.hour, template.minute, 0, 0);
      return {
        id: `meal-${day.participantId}-${toLocalDate(day.date)}-${index}`,
        source: "SYNTHETIC_QA",
        participantId: day.participantId,
        staffId: day.staffId,
        kind: "MEAL",
        scheduledAt,
        payload: {
          mealType: template.mealType,
          targetVolumeMl: template.targetVolumeMl,
        },
      };
    });
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    const mealType = String(task.payload?.mealType ?? "SNACK").toUpperCase() as MealType;
    const targetVolumeMl = Number(task.payload?.targetVolumeMl ?? task.payload?.volumeMl ?? 220);
    const isUnscheduledCarb =
      typeof task.payload?.note === "string" && task.payload.note.toLowerCase().includes("fast-acting");

    const amountEaten = isUnscheduledCarb ? "ONE_HUNDRED" : this.pickAmountEaten(r);
    const volumeMl = isUnscheduledCarb
      ? Math.max(120, Math.round(targetVolumeMl))
      : this.volumeFromAmount(targetVolumeMl, amountEaten, r);
    const deviationReason = isUnscheduledCarb
      ? "Unscheduled fast-acting carbs administered for low BGL."
      : amountEaten === "REFUSED"
        ? "Participant declined meal after prompting."
        : amountEaten === "ZERO"
          ? "Meal not consumed in allocated support window."
          : null;

    const swallowingObservations =
      amountEaten === "REFUSED" || amountEaten === "ZERO"
        ? (["NONE"] as SwallowObservation[])
        : r.uniform(0, 1) < 0.88
          ? (["NONE"] as SwallowObservation[])
          : ([r.weightedChoice<SwallowObservation>([
              ["MULTIPLE_SWALLOWS", 0.42],
              ["THROAT_CLEARING", 0.28],
              ["COUGHING", 0.2],
              ["WATERY_EYES", 0.1],
            ])] as SwallowObservation[]);

    const hasDefect = amountEaten === "REFUSED" || amountEaten === "ZERO";
    const localDate = toLocalDate(task.actualAt);

    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        kind: "MEAL",
        timestamp: task.actualAt,
        mealType,
        foodTexture: Number(ctx.day.planConfig?.defaultFoodTexture ?? 4),
        fluidThickness: Number(ctx.day.planConfig?.defaultFluidThickness ?? 2),
        volumeMl,
        amountEaten,
        swallowingObservations,
        deviationReason,
        qaAnomalyFlag: hasDefect,
        qaMeta: hasDefect ? { defect: "MEAL_VARIANCE" } : null,
      },
    ];
  }

  private pickAmountEaten(r: Rand): AmountEaten {
    return r.weightedChoice<AmountEaten>([
      ["ONE_HUNDRED", 46],
      ["SEVENTY_FIVE", 28],
      ["FIFTY", 16],
      ["TWENTY_FIVE", 5],
      ["ZERO", 2],
      ["REFUSED", 3],
    ]);
  }

  private volumeFromAmount(targetVolumeMl: number, amount: AmountEaten, r: Rand): number {
    if (amount === "REFUSED") {
      return 0;
    }
    const band = VOLUME_BANDS[amount];
    const ratio = r.uniform(band.min, band.max);
    return Math.max(0, Math.round(targetVolumeMl * ratio));
  }
}
