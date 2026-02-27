export const SYNTHETIC_SOURCE = "SYNTHETIC_QA" as const;
export type SyntheticSource = typeof SYNTHETIC_SOURCE;

export interface RNG {
  next(): number;
}

export class Mulberry32 implements RNG {
  private a: number;

  constructor(seed: number) {
    this.a = seed >>> 0;
  }

  next(): number {
    let t = (this.a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export class Rand {
  constructor(public readonly rng: RNG) {}

  uniform(min = 0, max = 1): number {
    return min + (max - min) * this.rng.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }

  normal(mean = 0, std = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.rng.next();
    while (v === 0) v = this.rng.next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * std;
  }

  truncatedNormal(mean: number, std: number, min: number, max: number, maxTries = 64): number {
    for (let i = 0; i < maxTries; i++) {
      const x = this.normal(mean, std);
      if (x >= min && x <= max) return x;
    }
    return clamp(this.normal(mean, std), min, max);
  }

  weightedChoice<T extends string>(entries: Array<[T, number]>): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) throw new Error("weightedChoice: total weight must be > 0");

    const r = this.uniform(0, total);
    let acc = 0;
    for (const [k, w] of entries) {
      acc += w;
      if (r <= acc) return k;
    }
    return entries[entries.length - 1][0];
  }
}

export const MS_PER_MIN = 60_000;
export const MS_PER_HOUR = 3_600_000;

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * MS_PER_MIN);
}

export function diffHours(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / MS_PER_HOUR;
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export type ShiftFatigueOptions = {
  shiftLengthHours?: number;
  baseSigmaMinutes?: number;
  endSigmaMultiplier?: number;
  sigmaShape?: number;
  lateBiasMinutes?: number;
  driftShape?: number;
  maxEarlyMinutes?: number;
  maxLateMinutes?: number;
};

export function applyShiftFatigueGaussianTimeVariance(params: {
  scheduledAt: Date;
  shiftStart: Date;
  rng: RNG;
  opts?: ShiftFatigueOptions;
}): Date {
  const { scheduledAt, shiftStart, rng } = params;
  const opts: Required<ShiftFatigueOptions> = {
    shiftLengthHours: params.opts?.shiftLengthHours ?? 12,
    baseSigmaMinutes: params.opts?.baseSigmaMinutes ?? 3,
    endSigmaMultiplier: params.opts?.endSigmaMultiplier ?? 8,
    sigmaShape: params.opts?.sigmaShape ?? 1.35,
    lateBiasMinutes: params.opts?.lateBiasMinutes ?? 7,
    driftShape: params.opts?.driftShape ?? 1.7,
    maxEarlyMinutes: params.opts?.maxEarlyMinutes ?? 12,
    maxLateMinutes: params.opts?.maxLateMinutes ?? 120,
  };

  const r = new Rand(rng);
  const h = clamp(diffHours(scheduledAt, shiftStart), 0, opts.shiftLengthHours);
  const p = clamp(h / opts.shiftLengthHours, 0, 1);

  const sigma =
    opts.baseSigmaMinutes *
    Math.exp(Math.log(opts.endSigmaMultiplier) * Math.pow(p, opts.sigmaShape));
  const mean = opts.lateBiasMinutes * Math.pow(p, opts.driftShape);

  const delayMin = r.truncatedNormal(
    mean,
    sigma,
    -Math.abs(opts.maxEarlyMinutes),
    Math.abs(opts.maxLateMinutes)
  );

  return addMinutes(scheduledAt, delayMin);
}

export type BehaviorState =
  | "Baseline"
  | "Agitated"
  | "Verbal_Escalation"
  | "PRN_Administered"
  | "Restrictive_Practice"
  | "Post_Incident_Recovery";

export type TransitionMatrix<S extends string> = Record<S, Array<[S, number]>>;

export const DEFAULT_BEHAVIOR_MATRIX: TransitionMatrix<BehaviorState> = {
  Baseline: [
    ["Baseline", 0.87],
    ["Agitated", 0.08],
    ["Verbal_Escalation", 0.03],
    ["PRN_Administered", 0.02],
  ],
  Agitated: [
    ["Baseline", 0.25],
    ["Agitated", 0.45],
    ["Verbal_Escalation", 0.2],
    ["PRN_Administered", 0.08],
    ["Restrictive_Practice", 0.02],
  ],
  Verbal_Escalation: [
    ["Baseline", 0.08],
    ["Agitated", 0.22],
    ["Verbal_Escalation", 0.38],
    ["PRN_Administered", 0.25],
    ["Restrictive_Practice", 0.07],
  ],
  PRN_Administered: [
    ["Baseline", 0.3],
    ["Agitated", 0.15],
    ["Verbal_Escalation", 0.05],
    ["PRN_Administered", 0.1],
    ["Restrictive_Practice", 0.03],
    ["Post_Incident_Recovery", 0.37],
  ],
  Restrictive_Practice: [
    ["Baseline", 0.05],
    ["Agitated", 0.2],
    ["Verbal_Escalation", 0.05],
    ["PRN_Administered", 0.1],
    ["Restrictive_Practice", 0.1],
    ["Post_Incident_Recovery", 0.5],
  ],
  Post_Incident_Recovery: [
    ["Baseline", 0.55],
    ["Agitated", 0.15],
    ["Verbal_Escalation", 0.05],
    ["PRN_Administered", 0.03],
    ["Restrictive_Practice", 0.02],
    ["Post_Incident_Recovery", 0.2],
  ],
};

export class MarkovChain<S extends string> {
  private readonly r: Rand;

  constructor(private readonly matrix: TransitionMatrix<S>, rng: RNG) {
    this.r = new Rand(rng);
    validateMatrix(matrix);
  }

  step(current: S): S {
    const row = this.matrix[current];
    if (!row) throw new Error(`MarkovChain: missing row for state ${current}`);
    return this.r.weightedChoice(row);
  }
}

export function validateMatrix<S extends string>(m: TransitionMatrix<S>): void {
  for (const [state, row] of Object.entries(m) as Array<[S, Array<[S, number]>]>) {
    const sum = row.reduce((acc, [, p]) => acc + p, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      throw new Error(`Transition row for "${state}" must sum to 1. Got ${sum}`);
    }
    for (const [, p] of row) {
      if (p < 0) throw new Error(`Transition row for "${state}" contains negative probability.`);
    }
  }
}

export type TaskKind =
  | "MAR"
  | "MEAL"
  | "BGL"
  | "SLEEP"
  | "BOWEL"
  | "HYGIENE"
  | "COMMUNITY"
  | "REPOSITION"
  | "INCIDENT"
  | "PRN"
  | "SHIFT_NOTE"
  | "RESTRICTIVE_PRACTICE";

export type ScheduledTask = {
  id: string;
  source: SyntheticSource;
  workerId: string;
  participantId: string;
  kind: TaskKind;
  scheduledAt: Date;
  durationMin?: number;
  payload?: {
    volumeMl?: number;
    reading?: number;
    note?: string;
    [key: string]: unknown;
  };
};

export type RealizedTask = ScheduledTask & {
  actualAt: Date;
  cascadeOffsetMin: number;
};

export type CascadeOptions = {
  extraDelayMin?: number;
  extraDelayMax?: number;
  sameDayOnly?: boolean;
  lowVolumeThresholdMl?: number;
  fatigue?: ShiftFatigueOptions;
};

const CASCADE_ROUTINE_KINDS = new Set<TaskKind>(["MEAL", "HYGIENE", "BGL"]);

export function realizeTimelineWithCascade(params: {
  tasks: ScheduledTask[];
  seed?: number;
  rng?: RNG;
  opts?: CascadeOptions;
}): RealizedTask[] {
  const rng = params.rng ?? new Mulberry32(params.seed ?? 20260227);
  const r = new Rand(rng);
  const extraMin = params.opts?.extraDelayMin ?? 0;
  const extraMax = params.opts?.extraDelayMax ?? 15;
  const sameDayOnly = params.opts?.sameDayOnly ?? true;
  const lowVolumeThresholdMl = params.opts?.lowVolumeThresholdMl ?? 150;

  const byWorker = new Map<string, ScheduledTask[]>();
  for (const t of params.tasks) {
    const list = byWorker.get(t.workerId) ?? [];
    list.push(t);
    byWorker.set(t.workerId, list);
  }

  const realized: RealizedTask[] = [];
  const lowVolumeHistory = new Map<string, number[]>();

  for (const [, list] of byWorker.entries()) {
    const tasks = [...list].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const shiftStart = tasks[0]?.scheduledAt;

    let cascadeOffsetMin = 0;
    let lastEndMs: number | null = null;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];

      if ((t.kind === "SLEEP") && (t.payload?.state === "Agitated" || t.payload?.state === "Verbal_Escalation")) {
        continue;
      }

      let baseTime = addMinutes(t.scheduledAt, cascadeOffsetMin);
      if (shiftStart) {
        baseTime = applyShiftFatigueGaussianTimeVariance({
          scheduledAt: baseTime,
          shiftStart,
          rng,
          opts: params.opts?.fatigue,
        });
      }

      let actualAt = baseTime;
      if (lastEndMs !== null && actualAt.getTime() < lastEndMs) {
        actualAt = new Date(lastEndMs);
      }

      const durationMin = t.durationMin ?? 0;
      const endMs = actualAt.getTime() + durationMin * MS_PER_MIN;

      realized.push({
        ...t,
        actualAt,
        cascadeOffsetMin,
      });

      if (t.kind === "RESTRICTIVE_PRACTICE") {
        cascadeOffsetMin += r.uniform(45, 90);
      } else if (t.kind === "INCIDENT" && durationMin > 0) {
        cascadeOffsetMin += durationMin + r.uniform(extraMin, extraMax);
      }

      if (t.kind === "BGL" && typeof t.payload?.reading === "number" && t.payload.reading < 4.0) {
        const mealAt = addMinutes(actualAt, 3);
        realized.push({
          id: `${t.id}-hypo-meal`,
          source: SYNTHETIC_SOURCE,
          workerId: t.workerId,
          participantId: t.participantId,
          kind: "MEAL",
          scheduledAt: mealAt,
          actualAt: mealAt,
          cascadeOffsetMin,
          payload: { volumeMl: 120, note: "Unscheduled fast-acting carbs" },
        });

        const noteAt = addMinutes(actualAt, 4);
        realized.push({
          id: `${t.id}-hypo-note`,
          source: SYNTHETIC_SOURCE,
          workerId: t.workerId,
          participantId: t.participantId,
          kind: "SHIFT_NOTE",
          scheduledAt: noteAt,
          actualAt: noteAt,
          cascadeOffsetMin,
          payload: { note: `Clinical escalation: BGL ${t.payload.reading.toFixed(1)} mmol/L` },
        });
      }

      if (t.kind === "MEAL" || t.kind === "BOWEL") {
        const volume = t.payload?.volumeMl;
        if (typeof volume === "number") {
          const prev = lowVolumeHistory.get(t.participantId) ?? [];
          const next = [...prev, volume].slice(-3);
          lowVolumeHistory.set(t.participantId, next);

          if (next.length === 3 && next.every((v) => v < lowVolumeThresholdMl)) {
            const noteAt = addMinutes(actualAt, 2);
            realized.push({
              id: `${t.id}-dehydration-note`,
              source: SYNTHETIC_SOURCE,
              workerId: t.workerId,
              participantId: t.participantId,
              kind: "SHIFT_NOTE",
              scheduledAt: noteAt,
              actualAt: noteAt,
              cascadeOffsetMin,
              payload: {
                note: "Clinical escalation: low intake/output across 3 consecutive entries",
              },
            });
          }
        }
      }

      if (lastEndMs === null || endMs > lastEndMs) {
        lastEndMs = endMs;
      }

      if (sameDayOnly) {
        const next = tasks[i + 1];
        if (next && !sameLocalDay(next.scheduledAt, t.scheduledAt)) {
          cascadeOffsetMin = 0;
          lastEndMs = null;
        }
      }

      if (!CASCADE_ROUTINE_KINDS.has(t.kind) && t.kind !== "RESTRICTIVE_PRACTICE" && t.kind !== "INCIDENT") {
        // No-op marker branch to make future task-kind specific handling explicit.
      }
    }
  }

  return realized.sort((a, b) => a.actualAt.getTime() - b.actualAt.getTime());
}
