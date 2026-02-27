import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

export class BowelFluidChartModule implements ChartModule {
  readonly type = "BOWEL_FLUID";
  private cumulative: Record<string, { intake: number; output: number }> = {};
  private lastBowelMovement: Record<string, Date | null> = {};
  private defectUntil: Record<string, Date | null> = {};

  buildSchedule(day: DayContext): ScheduledTask[] {
    const tasks: ScheduledTask[] = [];
    const intakeTimes = [8, 12, 15, 18, 20];
    const outputTimes = [10, 14, 19];

    intakeTimes.forEach((h, i) => {
      const d = new Date(day.date);
      d.setHours(h, 0, 0, 0);
      tasks.push({
        id: `bf-intake-${i}-${day.participantId}`,
        source: "SYNTHETIC_QA",
        staffId: day.staffId,
        participantId: day.participantId,
        kind: "BOWEL",
        scheduledAt: d,
        payload: { type: "INTAKE" },
      });
    });

    outputTimes.forEach((h, i) => {
      const d = new Date(day.date);
      d.setHours(h, 30, 0, 0);
      tasks.push({
        id: `bf-output-${i}-${day.participantId}`,
        source: "SYNTHETIC_QA",
        staffId: day.staffId,
        participantId: day.participantId,
        kind: "BOWEL",
        scheduledAt: d,
        payload: { type: "OUTPUT" },
      });
    });

    const bm = new Date(day.date);
    bm.setHours(9, 15, 0, 0);
    tasks.push({
      id: `bf-bm-${day.participantId}`,
      source: "SYNTHETIC_QA",
      staffId: day.staffId,
      participantId: day.participantId,
      kind: "BOWEL",
      scheduledAt: bm,
      payload: { type: "BOWEL" },
    });

    return tasks;
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const localDate = task.actualAt.toISOString().split("T")[0];
    const key = `${task.participantId}-${localDate}`;
    if (!this.cumulative[key]) {
      this.cumulative[key] = { intake: 0, output: 0 };
    }

    const r = new Rand(ctx.rng);
    let intakeDelta = 0;
    let outputDelta = 0;
    let hadBowelMotion = false;
    let bristolScale: string | null = null;
    const now = task.actualAt;

    if (!this.defectUntil[task.participantId]) {
      if (r.uniform(0, 1) < 0.1) {
        this.defectUntil[task.participantId] = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      }
    }

    const defectUntil = this.defectUntil[task.participantId];
    const defectActive = defectUntil ? now < defectUntil : false;

    switch (task.payload?.type) {
      case "INTAKE":
        intakeDelta = r.int(100, 350);
        this.cumulative[key].intake += intakeDelta;
        break;
      case "OUTPUT":
        outputDelta = r.int(80, 300);
        this.cumulative[key].output += outputDelta;
        break;
      case "BOWEL":
        if (!defectActive) {
          hadBowelMotion = true;
          bristolScale = r.weightedChoice([
            ["S3", 0.2],
            ["S4", 0.4],
            ["S5", 0.25],
            ["S2", 0.1],
            ["S6", 0.05],
          ]);
          this.lastBowelMovement[task.participantId] = now;
        }
        break;
      default:
        break;
    }

    const net = this.cumulative[key].intake - this.cumulative[key].output;

    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        loggedAt: now,
        hadBowelMotion,
        bristolScale,
        fluidIntakeDeltaMl: intakeDelta,
        fluidOutputDeltaMl: outputDelta,
        cumulativeIntakeMl: this.cumulative[key].intake,
        cumulativeOutputMl: this.cumulative[key].output,
        netBalanceMl: net,
        qaMeta: defectActive ? { defect: "NO_BM_72H_NO_ESCALATION" } : null,
      },
    ];
  }
}
