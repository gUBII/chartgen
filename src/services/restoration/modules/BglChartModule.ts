import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

export class BglChartModule implements ChartModule {
  readonly type = "BGL";
  private readonly readingTimes = [
    { hour: 7, minute: 30 },
    { hour: 12, minute: 0 },
    { hour: 17, minute: 30 },
  ];

  buildSchedule(day: DayContext): ScheduledTask[] {
    return this.readingTimes.map((t, idx) => {
      const d = new Date(day.date);
      d.setHours(t.hour, t.minute, 0, 0);
      return {
        id: `bgl-${day.participantId}-${idx}`,
        source: "SYNTHETIC_QA",
        staffId: day.staffId,
        participantId: day.participantId,
        kind: "BGL",
        scheduledAt: d,
        payload: { slot: idx },
      };
    });
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    const reading = Math.max(0, r.normal(7.5, 2.2));
    let actionTaken: string | null = null;
    let insulinAdministered = false;
    let linkedMarId: string | null = null;

    if (reading < 4.0) {
      actionTaken = "FAST_ACTING_CARB_ADMINISTERED";
      insulinAdministered = true;

      if (typeof ctx.link.createMarAdminStub === "function") {
        const stub = ctx.link.createMarAdminStub({
          participantId: task.participantId,
          staffId: task.staffId,
          occurredAt: task.actualAt,
          medicationName: "Fast Acting Carb",
          dose: "15g",
          route: "Oral",
        });
        linkedMarId = stub.marId;
      }
    }

    const localDate = task.actualAt.toISOString().split("T")[0];
    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        loggedAt: task.actualAt,
        bglReadingMmolL: reading,
        fastingStatus: "UNKNOWN",
        insulinAdministered,
        insulinMarRefId: linkedMarId,
        actionTaken,
        qaMeta: reading < 4.0 ? { defect: "HYPO_EVENT" } : null,
      },
    ];
  }
}
