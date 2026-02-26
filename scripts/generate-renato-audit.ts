import { Prisma, PrismaClient, StaffRole } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const SOURCE = "AUDIT_RECOVERY";
const DEFAULT_MODE = "hard-isolate" as const;
const DEFAULT_TIMEZONE = "Australia/Sydney" as const;
const DEFAULT_ANOMALIES = "locked" as const;
const DEFAULT_SEED = "renato-audit-v1";

const SIM_START_DATE = "2025-09-17";
const SIM_END_DATE = "2026-04-07";

const PARTICIPANT = {
  id: "renato-gentili",
  fullName: "Renato Gentili",
  externalReference: "NDIS-RENATO-GENTILI",
  defaultFoodTexture: 5,
  defaultFluidThickness: 2,
} as const;

type CliOptions = {
  mode: typeof DEFAULT_MODE;
  timezone: typeof DEFAULT_TIMEZONE;
  anomalies: typeof DEFAULT_ANOMALIES;
  seed: string;
};

type StaffSeed = {
  key: "STAFF_PRIMARY" | "STAFF_FLOAT_A" | "STAFF_FLOAT_B" | "STAFF_FLOAT_C" | "STAFF_FLOAT_D" | "STAFF_FLOAT_E";
  id: string;
  workerNumber: string;
  displayName: string;
  role: StaffRole;
  start: string;
  end: string;
};

const STAFF_PRIMARY: StaffSeed = {
  key: "STAFF_PRIMARY",
  id: "618427",
  workerNumber: "REN-618427",
  displayName: "Renato Primary Worker",
  role: StaffRole.SUPPORT_WORKER,
  start: SIM_START_DATE,
  end: SIM_END_DATE,
};

const FLOATER_STAFF: StaffSeed[] = [
  {
    key: "STAFF_FLOAT_A",
    id: "903551",
    workerNumber: "REN-903551",
    displayName: "Renato Floater A",
    role: StaffRole.SUPPORT_WORKER,
    start: "2025-09-17",
    end: "2025-10-31",
  },
  {
    key: "STAFF_FLOAT_B",
    id: "274860",
    workerNumber: "REN-274860",
    displayName: "Renato Floater B",
    role: StaffRole.SUPPORT_WORKER,
    start: "2025-10-01",
    end: "2025-12-31",
  },
  {
    key: "STAFF_FLOAT_C",
    id: "771934",
    workerNumber: "REN-771934",
    displayName: "Renato Floater C",
    role: StaffRole.SUPPORT_WORKER,
    start: "2025-10-01",
    end: "2026-04-07",
  },
  {
    key: "STAFF_FLOAT_D",
    id: "452108",
    workerNumber: "REN-452108",
    displayName: "Renato Floater D",
    role: StaffRole.SUPPORT_WORKER,
    start: "2025-11-01",
    end: "2026-04-07",
  },
  {
    key: "STAFF_FLOAT_E",
    id: "689245",
    workerNumber: "REN-689245",
    displayName: "Renato Floater E",
    role: StaffRole.SUPPORT_WORKER,
    start: "2025-12-01",
    end: "2026-02-28",
  },
];

const ALL_STAFF = [STAFF_PRIMARY, ...FLOATER_STAFF] as const;
const ROSTER_STAFF_IDS = ALL_STAFF.map((staff) => staff.id);

const LOCKED_DINNER_MISS_DATES = new Set(["2025-12-18", "2026-01-17", "2026-04-03"]);
const LOCKED_CASCADE_DATE = "2026-02-13";

const DINNER_MISS_REASON_BY_DATE_MED: Record<string, string> = {
  "2025-12-18|Sodium Valproate": "Asleep",
  "2025-12-18|Atorvastatin": "Asleep",
  "2026-01-17|Sodium Valproate": "Participant went to bed early",
  "2026-01-17|Atorvastatin": "Participant went to bed early",
  "2026-04-03|Sodium Valproate": "Asleep",
  "2026-04-03|Atorvastatin": "Participant went to bed early",
};

const CASCADE_REASON = "Refused morning access/Slept in";
const OLANZAPINE_REASONS = ["Agitation", "Anxiety"] as const;
const CBD_REASONS = ["Pain", "Prompted by staff"] as const;

type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
type AmountEaten = "ZERO" | "TWENTY_FIVE" | "FIFTY" | "SEVENTY_FIVE" | "ONE_HUNDRED" | "REFUSED";
type SwallowObservation =
  | "NONE"
  | "COUGHING"
  | "GAGGING"
  | "CHOKING"
  | "WATERY_EYES"
  | "MULTIPLE_SWALLOWS"
  | "THROAT_CLEARING";
type MARStatus = "ADMINISTERED" | "REFUSED" | "HELD" | "LATE" | "NOT_ADMINISTERED";

type MealTemplate = {
  mealType: MealType;
  minuteOfDay: number;
  minVolumeMl: number;
  maxVolumeMl: number;
};

type RoutineMedTemplate = {
  medicationName: string;
  dosage: string;
  minuteOfDay: number;
};

const MEAL_TEMPLATES: MealTemplate[] = [
  { mealType: "BREAKFAST", minuteOfDay: 8 * 60 + 30, minVolumeMl: 240, maxVolumeMl: 360 },
  { mealType: "LUNCH", minuteOfDay: 12 * 60 + 30, minVolumeMl: 300, maxVolumeMl: 420 },
  { mealType: "SNACK", minuteOfDay: 15 * 60, minVolumeMl: 120, maxVolumeMl: 220 },
  { mealType: "DINNER", minuteOfDay: 18 * 60 + 30, minVolumeMl: 300, maxVolumeMl: 440 },
];

const ROUTINE_MEDS: RoutineMedTemplate[] = [
  { medicationName: "Citalopram", dosage: "20mg", minuteOfDay: 8 * 60 },
  { medicationName: "Sodium Valproate", dosage: "500mg", minuteOfDay: 8 * 60 },
  { medicationName: "Aspirin", dosage: "100mg", minuteOfDay: 8 * 60 },
  { medicationName: "Sodium Valproate", dosage: "500mg", minuteOfDay: 20 * 60 },
  { medicationName: "Atorvastatin", dosage: "80mg", minuteOfDay: 20 * 60 },
];

const FORCED_MAR_STAFF: Record<string, string> = {
  "2025-12-18|Sodium Valproate|500mg|1200|NOT_ADMINISTERED": "618427",
  "2025-12-18|Atorvastatin|80mg|1200|NOT_ADMINISTERED": "689245",
  "2026-01-17|Sodium Valproate|500mg|1200|NOT_ADMINISTERED": "689245",
  "2026-01-17|Atorvastatin|80mg|1200|NOT_ADMINISTERED": "771934",
  "2026-04-03|Sodium Valproate|500mg|1200|NOT_ADMINISTERED": "618427",
  "2026-04-03|Atorvastatin|80mg|1200|NOT_ADMINISTERED": "618427",
  "2026-02-13|Citalopram|20mg|750|LATE": "771934",
  "2026-02-13|Sodium Valproate|500mg|750|LATE": "689245",
  "2026-02-13|Aspirin|100mg|750|LATE": "618427",
  "2026-02-13|Sodium Valproate|500mg|1275|ADMINISTERED": "618427",
  "2026-02-13|Atorvastatin|80mg|1275|ADMINISTERED": "618427",
};

type AssignableRow = {
  localDate: string;
  createdByStaffId: string;
  forcedStaffId: string | null;
  debugLabel: string;
};

type MealRow = AssignableRow & {
  id: string;
  participantId: string;
  source: string;
  timestampLocal: string;
  mealType: MealType;
  foodTexture: number;
  fluidThickness: number;
  volumeMl: number;
  amountEaten: AmountEaten;
  swallowingObservations: SwallowObservation[];
  deviationReason: string | null;
  incidentReference: string | null;
  provenanceHash: string;
};

type MARRow = AssignableRow & {
  id: string;
  participantId: string;
  source: string;
  scheduledLocalDateTime: string;
  actualLocalDateTime: string;
  scheduledMinuteOfDay: number;
  actualMinuteOfDay: number;
  medicationName: string;
  dosage: string;
  route: string;
  status: MARStatus;
  omissionReason: string | null;
  provenanceHash: string;
};

type LedgerResult = {
  mealRows: MealRow[];
  marRows: MARRow[];
  summary: {
    startDate: string;
    endDate: string;
    totalDays: number;
    dinnerMissDates: string[];
    cascadeDate: string;
    signature: string;
  };
};

class SeededRng {
  private state: number;

  constructor(seed: string) {
    this.state = seedToUint32(seed);
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty array.");
    }
    return items[this.int(0, items.length - 1)] as T;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      const swap = copy[i];
      copy[i] = copy[j] as T;
      copy[j] = swap as T;
    }
    return copy;
  }

  pickWeighted<T>(options: Array<{ value: T; weight: number }>): T {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    const target = this.nextFloat() * totalWeight;
    let running = 0;
    for (const option of options) {
      running += option.weight;
      if (target <= running) {
        return option.value;
      }
    }
    return options[options.length - 1]!.value;
  }
}

function seedToUint32(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: DEFAULT_MODE,
    timezone: DEFAULT_TIMEZONE,
    anomalies: DEFAULT_ANOMALIES,
    seed: DEFAULT_SEED,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument format: ${arg}`);
    }

    const [key, rawValue] = arg.slice(2).split("=", 2);
    const value = rawValue ?? "";

    if (key === "mode") {
      if (value !== DEFAULT_MODE) {
        throw new Error(`Unsupported mode '${value}'. Only '${DEFAULT_MODE}' is supported.`);
      }
      options.mode = value;
      continue;
    }

    if (key === "timezone") {
      if (value !== DEFAULT_TIMEZONE) {
        throw new Error(`Unsupported timezone '${value}'. Only '${DEFAULT_TIMEZONE}' is supported.`);
      }
      options.timezone = value;
      continue;
    }

    if (key === "anomalies") {
      if (value !== DEFAULT_ANOMALIES) {
        throw new Error(`Unsupported anomalies mode '${value}'. Only '${DEFAULT_ANOMALIES}' is supported.`);
      }
      options.anomalies = value;
      continue;
    }

    if (key === "seed") {
      if (!value.trim()) {
        throw new Error("--seed must be a non-empty string.");
      }
      options.seed = value;
      continue;
    }

    throw new Error(`Unknown argument: --${key}`);
  }

  return options;
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateRangeInclusive(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  let cursor = startIso;
  while (cursor <= endIso) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function minuteToHHMM(minuteOfDay: number): string {
  if (minuteOfDay < 0 || minuteOfDay > 1439) {
    throw new Error(`Minute-of-day out of range: ${minuteOfDay}`);
  }
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function toLocalDateTime(localDate: string, minuteOfDay: number): string {
  return `${localDate} ${minuteToHHMM(minuteOfDay)}:00`;
}

function activeFloaterIds(localDate: string): string[] {
  return FLOATER_STAFF.filter((staff) => localDate >= staff.start && localDate <= staff.end).map((staff) => staff.id);
}

function staffIsActiveOnDate(staffId: string, localDate: string): boolean {
  const staff = ALL_STAFF.find((entry) => entry.id === staffId);
  if (!staff) {
    return false;
  }
  return localDate >= staff.start && localDate <= staff.end;
}

function marForcedKey(
  localDate: string,
  medicationName: string,
  dosage: string,
  scheduledMinuteOfDay: number,
  status: MARStatus
): string {
  return `${localDate}|${medicationName}|${dosage}|${scheduledMinuteOfDay}|${status}`;
}

function mealAmount(rng: SeededRng): AmountEaten {
  return rng.pickWeighted<AmountEaten>([
    { value: "ONE_HUNDRED", weight: 46 },
    { value: "SEVENTY_FIVE", weight: 28 },
    { value: "FIFTY", weight: 16 },
    { value: "TWENTY_FIVE", weight: 7 },
    { value: "REFUSED", weight: 2 },
    { value: "ZERO", weight: 1 },
  ]);
}

function buildMealRows(localDate: string, rng: SeededRng, seed: string, counters: { meal: number }): MealRow[] {
  return MEAL_TEMPLATES.map((template) => {
    const mealIndex = counters.meal;
    counters.meal += 1;
    const timestampLocal = toLocalDateTime(localDate, template.minuteOfDay);

    return {
      id: `meal_${sha256(`${seed}|meal|${localDate}|${template.mealType}|${mealIndex}`).slice(0, 30)}`,
      participantId: PARTICIPANT.id,
      createdByStaffId: "",
      forcedStaffId: null,
      localDate,
      debugLabel: `MEAL:${template.mealType}:${timestampLocal}`,
      source: SOURCE,
      timestampLocal,
      mealType: template.mealType,
      foodTexture: 5,
      fluidThickness: 2,
      volumeMl: rng.int(template.minVolumeMl, template.maxVolumeMl),
      amountEaten: mealAmount(rng),
      swallowingObservations: ["NONE"],
      deviationReason: null,
      incidentReference: null,
      provenanceHash: sha256(`${seed}|meal|${localDate}|${template.mealType}|${timestampLocal}|${mealIndex}`),
    };
  });
}

function dinnerMissReason(localDate: string, medicationName: string): string {
  const key = `${localDate}|${medicationName}`;
  const reason = DINNER_MISS_REASON_BY_DATE_MED[key];
  if (!reason) {
    throw new Error(`Missing dinner miss reason mapping for ${key}`);
  }
  return reason;
}

function buildRoutineMarRows(localDate: string, rng: SeededRng, seed: string, counters: { mar: number }): MARRow[] {
  const isCascadeDay = localDate === LOCKED_CASCADE_DATE;
  const isDinnerMissDay = LOCKED_DINNER_MISS_DATES.has(localDate);

  return ROUTINE_MEDS.map((med) => {
    const marIndex = counters.mar;
    counters.mar += 1;

    const isDinnerRoutine =
      med.minuteOfDay === 20 * 60 && ["Sodium Valproate", "Atorvastatin"].includes(med.medicationName);

    let scheduledMinuteOfDay = med.minuteOfDay;
    let actualMinuteOfDay = med.minuteOfDay + rng.int(-12, 22);
    let status: MARStatus = "ADMINISTERED";
    let omissionReason: string | null = null;

    if (isCascadeDay && med.minuteOfDay === 8 * 60) {
      scheduledMinuteOfDay = 12 * 60 + 30;
      actualMinuteOfDay = 12 * 60 + 30;
      status = "LATE";
      omissionReason = CASCADE_REASON;
    }

    if (isCascadeDay && med.minuteOfDay === 20 * 60) {
      scheduledMinuteOfDay = 21 * 60 + 15;
      actualMinuteOfDay = 21 * 60 + 15;
    }

    if (isDinnerMissDay && isDinnerRoutine) {
      scheduledMinuteOfDay = 20 * 60;
      actualMinuteOfDay = 20 * 60;
      status = "NOT_ADMINISTERED";
      omissionReason = dinnerMissReason(localDate, med.medicationName);
    }

    const forcedStaffId =
      FORCED_MAR_STAFF[
        marForcedKey(localDate, med.medicationName, med.dosage, scheduledMinuteOfDay, status)
      ] ?? null;

    const scheduledLocalDateTime = toLocalDateTime(localDate, scheduledMinuteOfDay);
    const actualLocalDateTime = toLocalDateTime(localDate, actualMinuteOfDay);

    return {
      id: `mar_${sha256(`${seed}|mar|routine|${localDate}|${med.medicationName}|${med.dosage}|${marIndex}`).slice(0, 31)}`,
      participantId: PARTICIPANT.id,
      createdByStaffId: "",
      forcedStaffId,
      localDate,
      debugLabel: `MAR:ROUTINE:${med.medicationName}:${scheduledLocalDateTime}:${status}`,
      source: SOURCE,
      scheduledLocalDateTime,
      actualLocalDateTime,
      scheduledMinuteOfDay,
      actualMinuteOfDay,
      medicationName: med.medicationName,
      dosage: med.dosage,
      route: "Oral",
      status,
      omissionReason,
      provenanceHash: sha256(
        `${seed}|mar|routine|${localDate}|${med.medicationName}|${med.dosage}|${scheduledLocalDateTime}|${actualLocalDateTime}|${status}|${omissionReason ?? ""}|${marIndex}`
      ),
    };
  });
}

function buildPrnMarRows(localDate: string, rng: SeededRng, seed: string, counters: { mar: number }): MARRow[] {
  const rows: MARRow[] = [];
  const isCascadeDay = localDate === LOCKED_CASCADE_DATE;

  if (rng.chance(0.9)) {
    const anchors: Array<{ label: "MORNING" | "LUNCH" | "DINNER"; minuteOfDay: number }> = [
      { label: "MORNING", minuteOfDay: 10 * 60 },
      { label: "LUNCH", minuteOfDay: 14 * 60 },
      { label: "DINNER", minuteOfDay: 19 * 60 },
    ];

    for (const anchor of anchors) {
      let minuteOfDay = anchor.minuteOfDay + rng.int(-90, 90);
      if (isCascadeDay && anchor.label === "LUNCH") {
        minuteOfDay = 14 * 60;
      }
      if (isCascadeDay && anchor.label === "DINNER") {
        minuteOfDay = 21 * 60 + 15;
      }

      const reason = rng.pick(OLANZAPINE_REASONS);
      const marIndex = counters.mar;
      counters.mar += 1;
      const localDateTime = toLocalDateTime(localDate, minuteOfDay);

      rows.push({
        id: `mar_${sha256(`${seed}|mar|olanzapine|${localDate}|${anchor.label}|${marIndex}`).slice(0, 31)}`,
        participantId: PARTICIPANT.id,
        createdByStaffId: "",
        forcedStaffId: null,
        localDate,
        debugLabel: `MAR:PRN:Olanzapine:${localDateTime}`,
        source: SOURCE,
        scheduledLocalDateTime: localDateTime,
        actualLocalDateTime: localDateTime,
        scheduledMinuteOfDay: minuteOfDay,
        actualMinuteOfDay: minuteOfDay,
        medicationName: "Olanzapine",
        dosage: "2.5mg",
        route: "Oral",
        status: "ADMINISTERED",
        omissionReason: reason,
        provenanceHash: sha256(`${seed}|mar|prn|olanzapine|${localDate}|${localDateTime}|${reason}|${marIndex}`),
      });
    }
  }

  if (rng.chance(0.15)) {
    let minuteOfDay = rng.int(16 * 60, 21 * 60);
    if (isCascadeDay) {
      minuteOfDay = 21 * 60 + 15;
    }

    const reason = rng.pick(CBD_REASONS);
    const marIndex = counters.mar;
    counters.mar += 1;
    const localDateTime = toLocalDateTime(localDate, minuteOfDay);

    rows.push({
      id: `mar_${sha256(`${seed}|mar|cbd|${localDate}|${marIndex}`).slice(0, 31)}`,
      participantId: PARTICIPANT.id,
      createdByStaffId: "",
      forcedStaffId: null,
      localDate,
      debugLabel: `MAR:PRN:CBD:${localDateTime}`,
      source: SOURCE,
      scheduledLocalDateTime: localDateTime,
      actualLocalDateTime: localDateTime,
      scheduledMinuteOfDay: minuteOfDay,
      actualMinuteOfDay: minuteOfDay,
      medicationName: "CBD Oil",
      dosage: "Per chart",
      route: "Oral",
      status: "ADMINISTERED",
      omissionReason: reason,
      provenanceHash: sha256(`${seed}|mar|prn|cbd|${localDate}|${localDateTime}|${reason}|${marIndex}`),
    });
  }

  return rows;
}

function allocateStaffForDay(localDate: string, rows: AssignableRow[], rng: SeededRng): void {
  if (rows.length === 0) {
    return;
  }

  const floaters = activeFloaterIds(localDate);
  if (floaters.length === 0) {
    throw new Error(`No active floaters available for ${localDate}`);
  }

  const targetPrimaryCount = Math.round(rows.length * 0.4);
  const unassignedIndexes: number[] = [];
  let forcedPrimaryCount = 0;

  rows.forEach((row, index) => {
    if (row.forcedStaffId) {
      if (!staffIsActiveOnDate(row.forcedStaffId, localDate)) {
        throw new Error(
          `Forced staff ${row.forcedStaffId} is not active on ${localDate} for entry ${row.debugLabel}`
        );
      }

      row.createdByStaffId = row.forcedStaffId;
      if (row.forcedStaffId === STAFF_PRIMARY.id) {
        forcedPrimaryCount += 1;
      }
      return;
    }

    unassignedIndexes.push(index);
  });

  if (forcedPrimaryCount > targetPrimaryCount) {
    throw new Error(
      `Forced primary assignments (${forcedPrimaryCount}) exceed 40% target (${targetPrimaryCount}) on ${localDate}`
    );
  }

  const neededPrimaryAssignments = targetPrimaryCount - forcedPrimaryCount;
  if (neededPrimaryAssignments > unassignedIndexes.length) {
    throw new Error(`Cannot satisfy primary ratio on ${localDate}; insufficient unassigned entries.`);
  }

  const shuffledUnassigned = rng.shuffle(unassignedIndexes);
  const primaryIndexSet = new Set(shuffledUnassigned.slice(0, neededPrimaryAssignments));

  for (const index of unassignedIndexes) {
    const row = rows[index]!;
    if (primaryIndexSet.has(index)) {
      row.createdByStaffId = STAFF_PRIMARY.id;
      continue;
    }

    row.createdByStaffId = rng.pick(floaters);
  }

  const primaryCount = rows.filter((row) => row.createdByStaffId === STAFF_PRIMARY.id).length;
  if (primaryCount !== targetPrimaryCount) {
    throw new Error(
      `Primary assignment mismatch on ${localDate}. expected=${targetPrimaryCount} actual=${primaryCount}`
    );
  }

  for (const row of rows) {
    if (!row.createdByStaffId) {
      throw new Error(`Missing assigned staff for ${row.debugLabel}`);
    }
    if (!staffIsActiveOnDate(row.createdByStaffId, localDate)) {
      throw new Error(`Assigned staff ${row.createdByStaffId} outside active window for ${row.debugLabel}`);
    }
    if (row.createdByStaffId !== STAFF_PRIMARY.id && !floaters.includes(row.createdByStaffId)) {
      throw new Error(
        `Assigned non-primary staff ${row.createdByStaffId} not in active floater set for ${localDate}`
      );
    }
  }
}

function buildLedgerRows(seed: string): LedgerResult {
  const rng = new SeededRng(seed);
  const days = dateRangeInclusive(SIM_START_DATE, SIM_END_DATE);
  const mealRows: MealRow[] = [];
  const marRows: MARRow[] = [];
  const counters = { meal: 0, mar: 0 };

  for (const localDate of days) {
    const dayMealRows = buildMealRows(localDate, rng, seed, counters);
    const dayMarRows = [
      ...buildRoutineMarRows(localDate, rng, seed, counters),
      ...buildPrnMarRows(localDate, rng, seed, counters),
    ];

    const assignables: AssignableRow[] = [...dayMealRows, ...dayMarRows];
    allocateStaffForDay(localDate, assignables, rng);

    mealRows.push(...dayMealRows);
    marRows.push(...dayMarRows);
  }

  const signatureHash = createHash("sha256");
  for (const row of [...mealRows, ...marRows].sort((a, b) => a.id.localeCompare(b.id))) {
    if ("timestampLocal" in row) {
      signatureHash.update(
        `meal|${row.id}|${row.timestampLocal}|${row.mealType}|${row.amountEaten}|${row.volumeMl}|${row.createdByStaffId}|${row.provenanceHash}`
      );
    } else {
      signatureHash.update(
        `mar|${row.id}|${row.scheduledLocalDateTime}|${row.actualLocalDateTime}|${row.medicationName}|${row.dosage}|${row.status}|${row.omissionReason ?? ""}|${row.createdByStaffId}|${row.provenanceHash}`
      );
    }
  }

  return {
    mealRows,
    marRows,
    summary: {
      startDate: SIM_START_DATE,
      endDate: SIM_END_DATE,
      totalDays: days.length,
      dinnerMissDates: [...LOCKED_DINNER_MISS_DATES].sort(),
      cascadeDate: LOCKED_CASCADE_DATE,
      signature: signatureHash.digest("hex"),
    },
  };
}

async function hardIsolateCleanup(tx: Prisma.TransactionClient): Promise<void> {
  await tx.auditEvent.deleteMany({});
  await tx.mealLog.deleteMany({});
  await tx.mARLog.deleteMany({});
  await tx.restoredMealCandidate.deleteMany({});
  await tx.restoredMARCandidate.deleteMany({});
  await tx.restorationBatch.deleteMany({});

  await tx.participant.deleteMany({
    where: {
      id: {
        not: PARTICIPANT.id,
      },
    },
  });

  await tx.staff.deleteMany({
    where: {
      id: {
        notIn: [...ROSTER_STAFF_IDS],
      },
    },
  });
}

async function seedParticipantAndStaff(tx: Prisma.TransactionClient): Promise<void> {
  await tx.participant.upsert({
    where: { id: PARTICIPANT.id },
    update: {
      fullName: PARTICIPANT.fullName,
      externalReference: PARTICIPANT.externalReference,
      defaultFoodTexture: PARTICIPANT.defaultFoodTexture,
      defaultFluidThickness: PARTICIPANT.defaultFluidThickness,
    },
    create: {
      id: PARTICIPANT.id,
      fullName: PARTICIPANT.fullName,
      externalReference: PARTICIPANT.externalReference,
      defaultFoodTexture: PARTICIPANT.defaultFoodTexture,
      defaultFluidThickness: PARTICIPANT.defaultFluidThickness,
    },
  });

  for (const staff of ALL_STAFF) {
    await tx.staff.upsert({
      where: { id: staff.id },
      update: {
        workerNumber: staff.workerNumber,
        displayName: staff.displayName,
        role: staff.role,
      },
      create: {
        id: staff.id,
        workerNumber: staff.workerNumber,
        displayName: staff.displayName,
        role: staff.role,
      },
    });
  }
}

async function insertMeals(
  tx: Prisma.TransactionClient,
  rows: MealRow[],
  timezone: string
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload = JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      participantId: row.participantId,
      createdByStaffId: row.createdByStaffId,
      source: row.source,
      timestampLocal: row.timestampLocal,
      mealType: row.mealType,
      foodTexture: row.foodTexture,
      fluidThickness: row.fluidThickness,
      volumeMl: row.volumeMl,
      amountEaten: row.amountEaten,
      swallowingObservations: row.swallowingObservations,
      deviationReason: row.deviationReason,
      incidentReference: row.incidentReference,
      provenanceHash: row.provenanceHash,
    }))
  );

  await tx.$executeRawUnsafe(
    `
    INSERT INTO "MealLog" (
      "id",
      "participantId",
      "createdByStaffId",
      "source",
      "timestamp",
      "mealType",
      "foodTexture",
      "fluidThickness",
      "volumeMl",
      "amountEaten",
      "swallowingObservations",
      "deviationReason",
      "incidentReference",
      "provenanceHash",
      "createdAt",
      "updatedAt"
    )
    SELECT
      x."id",
      x."participantId",
      x."createdByStaffId",
      x."source"::"EntrySource",
      ((x."timestampLocal"::timestamp AT TIME ZONE '${timezone}') AT TIME ZONE 'UTC')::timestamp,
      x."mealType"::"MealType",
      x."foodTexture",
      x."fluidThickness",
      x."volumeMl",
      x."amountEaten"::"AmountEaten",
      CASE
        WHEN x."swallowingObservations" IS NULL THEN ARRAY[]::"SwallowObservation"[]
        ELSE ARRAY(
          SELECT value::"SwallowObservation"
          FROM jsonb_array_elements_text(x."swallowingObservations") AS value
        )
      END,
      NULLIF(x."deviationReason", ''),
      NULLIF(x."incidentReference", ''),
      x."provenanceHash",
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM jsonb_to_recordset($1::jsonb) AS x(
      "id" text,
      "participantId" text,
      "createdByStaffId" text,
      "source" text,
      "timestampLocal" text,
      "mealType" text,
      "foodTexture" int,
      "fluidThickness" int,
      "volumeMl" int,
      "amountEaten" text,
      "swallowingObservations" jsonb,
      "deviationReason" text,
      "incidentReference" text,
      "provenanceHash" text
    )
    `,
    payload
  );
}

async function insertMarRows(
  tx: Prisma.TransactionClient,
  rows: MARRow[],
  timezone: string
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload = JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      participantId: row.participantId,
      createdByStaffId: row.createdByStaffId,
      source: row.source,
      scheduledLocalDateTime: row.scheduledLocalDateTime,
      actualLocalDateTime: row.actualLocalDateTime,
      medicationName: row.medicationName,
      dosage: row.dosage,
      route: row.route,
      status: row.status,
      omissionReason: row.omissionReason,
      provenanceHash: row.provenanceHash,
    }))
  );

  await tx.$executeRawUnsafe(
    `
    INSERT INTO "MARLog" (
      "id",
      "participantId",
      "createdByStaffId",
      "source",
      "scheduledAdminTime",
      "actualAdminTime",
      "medicationName",
      "dosage",
      "route",
      "status",
      "omissionReason",
      "provenanceHash",
      "createdAt",
      "updatedAt"
    )
    SELECT
      x."id",
      x."participantId",
      x."createdByStaffId",
      x."source"::"EntrySource",
      ((x."scheduledLocalDateTime"::timestamp AT TIME ZONE '${timezone}') AT TIME ZONE 'UTC')::timestamp,
      ((x."actualLocalDateTime"::timestamp AT TIME ZONE '${timezone}') AT TIME ZONE 'UTC')::timestamp,
      x."medicationName",
      x."dosage",
      x."route",
      x."status"::"MARStatus",
      NULLIF(x."omissionReason", ''),
      x."provenanceHash",
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM jsonb_to_recordset($1::jsonb) AS x(
      "id" text,
      "participantId" text,
      "createdByStaffId" text,
      "source" text,
      "scheduledLocalDateTime" text,
      "actualLocalDateTime" text,
      "medicationName" text,
      "dosage" text,
      "route" text,
      "status" text,
      "omissionReason" text,
      "provenanceHash" text
    )
    `,
    payload
  );
}

async function run(options: CliOptions): Promise<void> {
  const { mealRows, marRows, summary } = buildLedgerRows(options.seed);

  await prisma.$transaction(
    async (tx) => {
      if (options.mode === "hard-isolate") {
        await hardIsolateCleanup(tx);
      }

      await seedParticipantAndStaff(tx);
      await insertMeals(tx, mealRows, options.timezone);
      await insertMarRows(tx, marRows, options.timezone);
    },
    {
      maxWait: 20_000,
      timeout: 180_000,
    }
  );

  console.log(
    JSON.stringify(
      {
        result: "ok",
        mode: options.mode,
        timezone: options.timezone,
        anomalies: options.anomalies,
        seed: options.seed,
        participantId: PARTICIPANT.id,
        staffIds: {
          STAFF_PRIMARY: STAFF_PRIMARY.id,
          STAFF_FLOAT_A: FLOATER_STAFF[0]!.id,
          STAFF_FLOAT_B: FLOATER_STAFF[1]!.id,
          STAFF_FLOAT_C: FLOATER_STAFF[2]!.id,
          STAFF_FLOAT_D: FLOATER_STAFF[3]!.id,
          STAFF_FLOAT_E: FLOATER_STAFF[4]!.id,
        },
        summary,
        counts: {
          mealLogs: mealRows.length,
          marLogs: marRows.length,
          total: mealRows.length + marRows.length,
        },
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await run(options);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
