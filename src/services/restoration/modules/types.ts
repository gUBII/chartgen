import type { RNG } from "../stochasticEngine";

export type AnyRecord = Record<string, unknown>;

export type DayContext = {
  date: Date;
  participantId: string;
  staffId: string;
  planConfig: Record<string, unknown>;
};

export type GenerationContext = {
  rng: RNG;
  day: DayContext;
  link: AnyRecord;
};

export interface ChartModule {
  type: string;
  buildSchedule(day: DayContext): AnyRecord[];
  realizeTask(task: AnyRecord, ctx: GenerationContext): AnyRecord[];
}
