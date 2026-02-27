import { Rand, type RNG } from "../stochasticEngine";

export type AnyRecord = Record<string, unknown>;
export { Rand };

export type ScheduledTask = {
  id: string;
  source: string;
  participantId: string;
  staffId: string;
  kind: string;
  scheduledAt: Date;
  durationMin?: number;
  payload?: AnyRecord;
};

export type RealizedTask = ScheduledTask & {
  actualAt: Date;
  cascadeOffsetMin?: number;
};

export type DayContext = {
  date: Date;
  participantId: string;
  staffId: string;
  planConfig: AnyRecord;
};

export type LinkContext = AnyRecord & {
  createMarAdminStub?: (input: {
    participantId: string;
    staffId: string;
    occurredAt: Date;
    medicationName: string;
    dose: string;
    route: string;
  }) => { marId: string };
};

export type GenerationContext = {
  rng: RNG;
  day: DayContext;
  link: LinkContext;
};

export interface ChartModule {
  type: string;
  buildSchedule(day: DayContext): ScheduledTask[];
  realizeTask(task: RealizedTask, ctx: GenerationContext): AnyRecord[];
  injectDefects?(rows: AnyRecord[], ctx: GenerationContext): AnyRecord[];
}
