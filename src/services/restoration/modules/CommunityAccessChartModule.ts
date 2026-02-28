import { addMinutes } from "../stochasticEngine";
import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

type CommunityPurpose = "SOCIAL" | "MEDICAL" | "CAPACITY_BUILDING" | "OTHER";
type TransportMethod =
  | "WALK"
  | "PUBLIC_TRANSPORT"
  | "TAXI_RIDESHARE"
  | "PROVIDER_VEHICLE"
  | "PRIVATE_VEHICLE"
  | "OTHER";

const toLocalDate = (value: Date): string => value.toISOString().slice(0, 10);

const DESTINATIONS: Record<CommunityPurpose, readonly string[]> = {
  SOCIAL: ["Community Centre", "Local Cafe", "Family Visit", "Library"],
  MEDICAL: ["GP Clinic", "Pathology Centre", "Allied Health Clinic"],
  CAPACITY_BUILDING: ["Skills Workshop", "Volunteer Placement", "Training Hub"],
  OTHER: ["Local Shops", "Park", "Errand Route"],
};

export class CommunityAccessChartModule implements ChartModule {
  readonly type = "COMMUNITY_ACCESS";

  buildSchedule(day: DayContext): ScheduledTask[] {
    const scheduledAt = new Date(day.date);
    scheduledAt.setHours(10, 30, 0, 0);

    return [
      {
        id: `community-${day.participantId}-${toLocalDate(day.date)}`,
        source: "SYNTHETIC_QA",
        participantId: day.participantId,
        staffId: day.staffId,
        kind: "COMMUNITY",
        scheduledAt,
        payload: {
          baselineDurationMin: 120,
        },
      },
    ];
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    const purpose = r.weightedChoice<CommunityPurpose>([
      ["CAPACITY_BUILDING", 34],
      ["SOCIAL", 31],
      ["MEDICAL", 22],
      ["OTHER", 13],
    ]);
    const transportMethod = r.weightedChoice<TransportMethod>([
      ["PROVIDER_VEHICLE", 40],
      ["PRIVATE_VEHICLE", 18],
      ["PUBLIC_TRANSPORT", 14],
      ["WALK", 14],
      ["TAXI_RIDESHARE", 9],
      ["OTHER", 5],
    ]);

    const destinationOptions = DESTINATIONS[purpose];
    const destination = destinationOptions[r.int(0, destinationOptions.length - 1)];
    const durationMin = Math.max(45, Math.round(Number(task.payload?.baselineDurationMin ?? 120) + r.normal(0, 24)));

    const returnedMissing = r.uniform(0, 1) < 0.08;
    const returnedAt = returnedMissing ? null : addMinutes(task.actualAt, durationMin);
    const localDate = toLocalDate(task.actualAt);

    const usesVehicle = transportMethod === "PROVIDER_VEHICLE" || transportMethod === "PRIVATE_VEHICLE";
    const odometerStart = usesVehicle ? r.int(20_000, 95_000) : null;
    const odometerEnd = usesVehicle && odometerStart !== null ? odometerStart + r.int(3, 35) : null;

    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        kind: "COMMUNITY",
        departedAt: task.actualAt,
        returnedAt,
        destination,
        purpose,
        transportMethod,
        odometerStart,
        odometerEnd,
        notes: returnedMissing
          ? "Return time pending confirmation."
          : `Community access completed for ${durationMin} minutes.`,
        qaSeverity: returnedMissing ? "WARN" : "NONE",
        qaAnomalyFlag: returnedMissing,
        qaMeta: returnedMissing ? { defect: "MISSING_RETURN_TIME" } : null,
      },
    ];
  }
}
