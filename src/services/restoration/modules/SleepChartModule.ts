import { Rand, type ChartModule, type DayContext, type GenerationContext, type RealizedTask, type ScheduledTask } from "./types";

type BehaviorState =
  | "Baseline"
  | "Agitated"
  | "Verbal_Escalation"
  | "PRN_Administered"
  | "Post_Incident_Recovery";

const SLEEP_MARKOV: Record<BehaviorState, Array<[BehaviorState, number]>> = {
  Baseline: [["Baseline", 0.82], ["Agitated", 0.08], ["Verbal_Escalation", 0.05], ["PRN_Administered", 0.03], ["Post_Incident_Recovery", 0.02]],
  Agitated: [["Baseline", 0.2], ["Agitated", 0.4], ["Verbal_Escalation", 0.25], ["PRN_Administered", 0.1], ["Post_Incident_Recovery", 0.05]],
  Verbal_Escalation: [["Baseline", 0.1], ["Agitated", 0.25], ["Verbal_Escalation", 0.35], ["PRN_Administered", 0.2], ["Post_Incident_Recovery", 0.1]],
  PRN_Administered: [["Baseline", 0.4], ["Agitated", 0.15], ["Verbal_Escalation", 0.1], ["PRN_Administered", 0.1], ["Post_Incident_Recovery", 0.25]],
  Post_Incident_Recovery: [["Baseline", 0.6], ["Agitated", 0.1], ["Verbal_Escalation", 0.05], ["PRN_Administered", 0.05], ["Post_Incident_Recovery", 0.2]],
};

export class SleepChartModule implements ChartModule {
  readonly type = "SLEEP_SETTLING";
  private readonly tickMinutes = 60;
  private readonly zombieProbability = 0.12;

  buildSchedule(day: DayContext): ScheduledTask[] {
    const tasks: ScheduledTask[] = [];
    const start = new Date(day.date);
    start.setHours(22, 0, 0, 0);
    const end = new Date(day.date);
    end.setDate(end.getDate() + 1);
    end.setHours(6, 0, 0, 0);

    let cursor = new Date(start);
    let idx = 0;
    while (cursor < end) {
      tasks.push({
        id: `sleep-${day.participantId}-${day.date.toISOString()}-${idx}`,
        source: "SYNTHETIC_QA",
        staffId: day.staffId,
        participantId: day.participantId,
        kind: "SLEEP",
        scheduledAt: new Date(cursor),
        payload: { tickIndex: idx },
      });
      cursor = new Date(cursor.getTime() + this.tickMinutes * 60_000);
      idx++;
    }

    return tasks;
  }

  realizeTask(task: RealizedTask, ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    const tickIndex = Number(task.payload?.tickIndex ?? 0);
    const state = this.computeStateForTick(ctx, tickIndex);

    const isRestless = state === "Agitated" || state === "Verbal_Escalation";
    const status = isRestless ? "AWAKE" : "ASLEEP";
    const intervention = isRestless
      ? r.weightedChoice([
          ["VERBAL_PROMPT", 0.4],
          ["REDIRECTION", 0.3],
          ["COMFORT_MEASURES", 0.2],
          ["OTHER", 0.1],
        ])
      : "NONE";
    const localDate = task.actualAt.toISOString().split("T")[0];

    return [
      {
        source: "SYNTHETIC_QA",
        participantId: task.participantId,
        staffId: task.staffId,
        localDate,
        checkedAt: task.actualAt,
        status,
        intervention,
        notes: null,
        qaMeta: { behaviorState: state },
      },
    ];
  }

  injectDefects(rows: Record<string, unknown>[], ctx: GenerationContext): Record<string, unknown>[] {
    const r = new Rand(ctx.rng);
    if (r.uniform(0, 1) > this.zombieProbability) return rows;

    return rows.map((row) => {
      const checkedAt = row.checkedAt instanceof Date ? row.checkedAt : new Date(String(row.checkedAt));
      const d = new Date(checkedAt);
      d.setMinutes(0, 0, 0);
      return {
        ...row,
        checkedAt: d,
        status: "ASLEEP",
        intervention: "NONE",
        notes: "Participant asleep, breathing regular.",
        qaMeta: { ...(typeof row.qaMeta === "object" && row.qaMeta ? (row.qaMeta as Record<string, unknown>) : {}), defect: "ZOMBIE_LOG" },
      };
    });
  }

  private computeStateForTick(ctx: GenerationContext, tickIndex: number): BehaviorState {
    const r = new Rand(ctx.rng);
    let state: BehaviorState = "Baseline";
    for (let i = 0; i <= tickIndex; i++) {
      state = r.weightedChoice(SLEEP_MARKOV[state]);
    }
    return state;
  }
}
