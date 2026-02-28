import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

type RepositionPosition = "LEFT_SIDE" | "RIGHT_SIDE" | "SUPINE" | "PRONE" | "SEATED" | "TILT_IN_SPACE" | "OTHER";
type SkinCheckOutcome = "INTACT" | "REDNESS" | "BREAKDOWN" | "PAIN" | "REQUIRES_ESCALATION" | "UNKNOWN" | "OTHER";

const toLocalDate = (value: Date): string => value.toISOString().slice(0, 10);

export class RepositioningChartModule implements ChartModule {
  readonly type = "REPOSITIONING";
  private readonly intervalMin = 180;

  buildSchedule(day: DayContext): ScheduledTask[] {
    const tasks: ScheduledTask[] = [];
    const start = new Date(day.date);
    start.setHours(0, 0, 0, 0);

    for (let hour = 0; hour <= 21; hour += 3) {
      const scheduledAt = new Date(start);
      scheduledAt.setHours(hour, 0, 0, 0);
      tasks.push({
        id: `reposition-${day.participantId}-${toLocalDate(day.date)}-${hour}`,
        source: "SYNTHETIC_QA",
        participantId: day.participantId,
        staffId: day.staffId,
        kind: "REPOSITION",
        scheduledAt,
        payload: {
          planIntervalMin: this.intervalMin,
        },
      });
    }

    return tasks;
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    const position = r.weightedChoice<RepositionPosition>([
      ["LEFT_SIDE", 28],
      ["RIGHT_SIDE", 28],
      ["SUPINE", 18],
      ["SEATED", 14],
      ["TILT_IN_SPACE", 7],
      ["PRONE", 3],
      ["OTHER", 2],
    ]);
    const skinCheckOutcome = r.weightedChoice<SkinCheckOutcome>([
      ["INTACT", 86],
      ["REDNESS", 7],
      ["PAIN", 3],
      ["BREAKDOWN", 2],
      ["REQUIRES_ESCALATION", 1],
      ["UNKNOWN", 1],
    ]);

    const hasDefect = skinCheckOutcome === "BREAKDOWN" || skinCheckOutcome === "REQUIRES_ESCALATION";
    const localDate = toLocalDate(task.actualAt);

    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        kind: "REPOSITION",
        turnedAt: task.actualAt,
        position,
        skinCheckOutcome,
        planIntervalMin: Number(task.payload?.planIntervalMin ?? this.intervalMin),
        notes: hasDefect ? "Skin deterioration noted and escalation recommended." : "Routine repositioning completed.",
        qaSeverity: hasDefect ? "ERROR" : "NONE",
        qaAnomalyFlag: hasDefect,
        qaMeta: hasDefect ? { defect: "SKIN_INTEGRITY_RISK" } : null,
      },
    ];
  }
}
