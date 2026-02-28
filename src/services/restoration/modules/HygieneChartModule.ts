import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

type CompletionStatus = "COMPLETED" | "PARTIAL" | "REFUSED" | "NOT_APPLICABLE" | "UNKNOWN";

const toLocalDate = (value: Date): string => value.toISOString().slice(0, 10);

const HYGIENE_TIMES = [
  { hour: 7, minute: 15, slot: "MORNING" },
  { hour: 20, minute: 30, slot: "EVENING" },
] as const;

export class HygieneChartModule implements ChartModule {
  readonly type = "HYGIENE";

  buildSchedule(day: DayContext): ScheduledTask[] {
    return HYGIENE_TIMES.map((entry, index) => {
      const scheduledAt = new Date(day.date);
      scheduledAt.setHours(entry.hour, entry.minute, 0, 0);
      return {
        id: `hygiene-${day.participantId}-${toLocalDate(day.date)}-${index}`,
        source: "SYNTHETIC_QA",
        participantId: day.participantId,
        staffId: day.staffId,
        kind: "HYGIENE",
        scheduledAt,
        payload: { slot: entry.slot },
      };
    });
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    const isRefusalWindow = r.uniform(0, 1) < 0.11;
    const partialCare = !isRefusalWindow && r.uniform(0, 1) < 0.2;
    const localDate = toLocalDate(task.actualAt);

    const completedOrPartial = (completedWeight: number): CompletionStatus =>
      partialCare
        ? r.weightedChoice<CompletionStatus>([
            ["COMPLETED", completedWeight],
            ["PARTIAL", 100 - completedWeight],
          ])
        : "COMPLETED";

    const showerStatus = isRefusalWindow ? "REFUSED" : completedOrPartial(72);
    const oralCareStatus = isRefusalWindow ? "REFUSED" : completedOrPartial(82);
    const groomingStatus = isRefusalWindow ? "REFUSED" : completedOrPartial(76);
    const continenceCareStatus = completedOrPartial(86);
    const skinIntegrityChecked = completedOrPartial(84);

    const refusalReason = isRefusalWindow ? "Participant declined personal care after two prompts." : null;
    const alternativeMethod = isRefusalWindow ? "Verbal reassurance and comfort care completed." : null;
    const hasDefect = isRefusalWindow;

    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        kind: "HYGIENE",
        loggedAt: task.actualAt,
        showerStatus,
        oralCareStatus,
        groomingStatus,
        continenceCareStatus,
        skinIntegrityChecked,
        refusalReason,
        alternativeMethod,
        notes: hasDefect ? "Refusal logged and fallback support pathway documented." : "Routine hygiene care completed.",
        qaSeverity: hasDefect ? "WARN" : "NONE",
        qaAnomalyFlag: hasDefect,
        qaMeta: hasDefect ? { defect: "HYGIENE_REFUSAL" } : null,
      },
    ];
  }
}
