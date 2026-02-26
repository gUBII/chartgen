import { Prisma, PrismaClient, StaffRole } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const SOURCE = "AUDIT_RECOVERY";
const START_DATE = new Date(Date.UTC(2025, 8, 17));
const END_DATE = new Date(Date.UTC(2026, 3, 7));

const PARTICIPANT = {
  id: "renato-gentili",
  fullName: "Renato Gentili",
  externalReference: "NDIS-RENATO-GENTILI",
  defaultFoodTexture: 5,
  defaultFluidThickness: 2,
} as const;

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
  start: "2025-09-17",
  end: "2026-04-07",
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

const ALL_STAFF: StaffSeed[] = [STAFF_PRIMARY, ...FLOATER_STAFF];

const DINNER_MISS_REASONS = ["Participant went to bed early", "Asleep"] as const;
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

type MealDraft = {
  participantId: string;
  source: string;
  timestamp: Date;
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

type MARDraft = {
  participantId: string;
  source: string;
  scheduledAdminTime: Date;
  actualAdminTime: Date;
  medicationName: string;
  dosage: string;
  route: string;
  status: MARStatus;
  omissionReason: string | null;
  provenanceHash: string;
};

type MealRow = MealDraft & { createdByStaffId: string };
type MARRow = MARDraft & { createdByStaffId: string };

const MEAL_TEMPLATES: Array<{ mealType: MealType; hour: number; minute: number; minMl: number; maxMl: number }> = [
  { mealType: "BREAKFAST", hour: 8, minute: 30, minMl: 240, maxMl: 360 },
  { mealType: "LUNCH", hour: 12, minute: 30, minMl: 300, maxMl: 420 },
  { mealType: "SNACK", hour: 15, minute: 0, minMl: 120, maxMl: 220 },
  { mealType: "DINNER", hour: 18, minute: 30, minMl: 300, maxMl: 440 },
];

const ROUTINE_MEDS: Array<{ medicationName: string; dosage: string; hour: number; minute: number }> = [
  { medicationName: "Citalopram", dosage: "20mg", hour: 8, minute: 0 },
  { medicationName: "Sodium Valproate", dosage: "500mg", hour: 8, minute: 0 },
  { medicationName: "Aspirin", dosage: "100mg", hour: 8, minute: 0 },
  { medicationName: "Sodium Valproate", dosage: "500mg", hour: 20, minute: 0 },
  { medicationName: "Atorvastatin", dosage: "80mg", hour: 20, minute: 0 },
];

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function atUtcTime(day: Date, hour: number, minute: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute));
}

function dateRangeInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty array.");
  }
  return items[randomInt(0, items.length - 1)] as T;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    const temp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = temp as T;
  }
  return copy;
}

function pickWeighted<T>(options: Array<{ value: T; weight: number }>): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  const target = Math.random() * total;
  let running = 0;
  for (const option of options) {
    running += option.weight;
    if (target <= running) {
      return option.value;
    }
  }
  return options[options.length - 1]!.value;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function activeFloaterIds(forDay: string): string[] {
  return FLOATER_STAFF.filter((staff) => forDay >= staff.start && forDay <= staff.end).map((staff) => staff.id);
}

function allocateStaffIds(dayIso: string, entryCount: number): string[] {
  if (entryCount === 0) {
    return [];
  }

  const floaters = activeFloaterIds(dayIso);
  if (floaters.length === 0) {
    throw new Error(`No active floaters available for ${dayIso}.`);
  }

  const primarySlots = Math.min(entryCount, Math.max(1, Math.round(entryCount * 0.4)));
  const indexes = shuffled(Array.from({ length: entryCount }, (_, idx) => idx));
  const primaryIndexSet = new Set(indexes.slice(0, primarySlots));

  const assignment: string[] = [];
  for (let i = 0; i < entryCount; i += 1) {
    if (primaryIndexSet.has(i)) {
      assignment.push(STAFF_PRIMARY.id);
      continue;
    }
    assignment.push(pickRandom(floaters));
  }

  return assignment;
}

function buildMealDrafts(day: Date): MealDraft[] {
  return MEAL_TEMPLATES.map((template) => {
    const timestamp = atUtcTime(day, template.hour, template.minute);
    const amountEaten = pickWeighted<AmountEaten>([
      { value: "ONE_HUNDRED", weight: 46 },
      { value: "SEVENTY_FIVE", weight: 28 },
      { value: "FIFTY", weight: 16 },
      { value: "TWENTY_FIVE", weight: 7 },
      { value: "REFUSED", weight: 2 },
      { value: "ZERO", weight: 1 },
    ]);

    return {
      participantId: PARTICIPANT.id,
      source: SOURCE,
      timestamp,
      mealType: template.mealType,
      foodTexture: 5,
      fluidThickness: 2,
      volumeMl: randomInt(template.minMl, template.maxMl),
      amountEaten,
      swallowingObservations: ["NONE"],
      deviationReason: null,
      incidentReference: null,
      provenanceHash: hash(`meal|${PARTICIPANT.id}|${template.mealType}|${timestamp.toISOString()}|${Math.random()}`),
    };
  });
}

function buildRoutineMARDrafts(day: Date, isDinnerMissDate: boolean, isCascadeDate: boolean): MARDraft[] {
  return ROUTINE_MEDS.map((template) => {
    const originalScheduled = atUtcTime(day, template.hour, template.minute);
    let scheduledAdminTime = originalScheduled;
    let actualAdminTime = addMinutes(originalScheduled, randomInt(-12, 22));
    let status: MARStatus = "ADMINISTERED";
    let omissionReason: string | null = null;

    const isDinnerRoutine =
      template.hour === 20 && ["Sodium Valproate", "Atorvastatin"].includes(template.medicationName);

    if (isCascadeDate && template.hour === 8) {
      const cascadeMorning = atUtcTime(day, 12, 30);
      scheduledAdminTime = cascadeMorning;
      actualAdminTime = cascadeMorning;
      status = "LATE";
      omissionReason = CASCADE_REASON;
    }

    if (isCascadeDate && template.hour === 20) {
      const cascadeDinner = atUtcTime(day, 21, 15);
      scheduledAdminTime = cascadeDinner;
      actualAdminTime = cascadeDinner;
    }

    if (isDinnerMissDate && isDinnerRoutine) {
      scheduledAdminTime = originalScheduled;
      actualAdminTime = originalScheduled;
      status = "NOT_ADMINISTERED";
      omissionReason = pickRandom(DINNER_MISS_REASONS);
    }

    return {
      participantId: PARTICIPANT.id,
      source: SOURCE,
      scheduledAdminTime,
      actualAdminTime,
      medicationName: template.medicationName,
      dosage: template.dosage,
      route: "Oral",
      status,
      omissionReason,
      provenanceHash: hash(
        `mar|routine|${PARTICIPANT.id}|${template.medicationName}|${template.dosage}|${scheduledAdminTime.toISOString()}|${status}|${Math.random()}`
      ),
    };
  });
}

function buildPrnMARDrafts(day: Date, isCascadeDate: boolean): MARDraft[] {
  const drafts: MARDraft[] = [];

  if (chance(0.9)) {
    const anchors: Array<{ label: "MORNING" | "LUNCH" | "DINNER"; hour: number; minute: number }> = [
      { label: "MORNING", hour: 10, minute: 0 },
      { label: "LUNCH", hour: 14, minute: 0 },
      { label: "DINNER", hour: 19, minute: 0 },
    ];

    for (const anchor of anchors) {
      let time = addMinutes(atUtcTime(day, anchor.hour, anchor.minute), randomInt(-90, 90));

      if (isCascadeDate && anchor.label === "LUNCH") {
        time = atUtcTime(day, 14, 0);
      }

      if (isCascadeDate && anchor.label === "DINNER") {
        time = atUtcTime(day, 21, 15);
      }

      const reason = pickRandom(OLANZAPINE_REASONS);

      drafts.push({
        participantId: PARTICIPANT.id,
        source: SOURCE,
        scheduledAdminTime: time,
        actualAdminTime: time,
        medicationName: "Olanzapine",
        dosage: "2.5mg",
        route: "Oral",
        status: "ADMINISTERED",
        omissionReason: reason,
        provenanceHash: hash(`mar|prn|olanzapine|${time.toISOString()}|${reason}|${Math.random()}`),
      });
    }
  }

  if (chance(0.15)) {
    const between1600And2100 = () => {
      const start = atUtcTime(day, 16, 0).getTime();
      const end = atUtcTime(day, 21, 0).getTime();
      return new Date(randomInt(start, end));
    };

    const time = isCascadeDate ? atUtcTime(day, 21, 15) : between1600And2100();
    const reason = pickRandom(CBD_REASONS);

    drafts.push({
      participantId: PARTICIPANT.id,
      source: SOURCE,
      scheduledAdminTime: time,
      actualAdminTime: time,
      medicationName: "CBD Oil",
      dosage: "Per chart",
      route: "Oral",
      status: "ADMINISTERED",
      omissionReason: reason,
      provenanceHash: hash(`mar|prn|cbd|${time.toISOString()}|${reason}|${Math.random()}`),
    });
  }

  return drafts;
}

function chooseAnomalyDates(allDays: Date[]): { cascadeDate: string; dinnerMissDates: Set<string> } {
  const feb2026Days = allDays.filter((day) => day.getUTCFullYear() === 2026 && day.getUTCMonth() === 1);
  if (feb2026Days.length === 0) {
    throw new Error("No dates found in Feb 2026 for cascade anomaly selection.");
  }

  const cascadeDate = dayKey(pickRandom(feb2026Days));
  const candidates = allDays.map(dayKey).filter((key) => key !== cascadeDate);
  const dinnerMissDates = new Set(shuffled(candidates).slice(0, 3));

  if (dinnerMissDates.size !== 3) {
    throw new Error("Unable to allocate exactly 3 dinner-miss anomaly dates.");
  }

  return { cascadeDate, dinnerMissDates };
}

function buildLedgerRows(): {
  mealRows: MealRow[];
  marRows: MARRow[];
  cascadeDate: string;
  dinnerMissDates: string[];
} {
  const allDays = dateRangeInclusive(START_DATE, END_DATE);
  const { cascadeDate, dinnerMissDates } = chooseAnomalyDates(allDays);

  const mealRows: MealRow[] = [];
  const marRows: MARRow[] = [];

  for (const day of allDays) {
    const key = dayKey(day);
    const isDinnerMissDate = dinnerMissDates.has(key);
    const isCascadeDate = key === cascadeDate;

    const mealDrafts = buildMealDrafts(day);
    const marDrafts = [
      ...buildRoutineMARDrafts(day, isDinnerMissDate, isCascadeDate),
      ...buildPrnMARDrafts(day, isCascadeDate),
    ];

    const assignments = allocateStaffIds(key, mealDrafts.length + marDrafts.length);

    let cursor = 0;
    for (const draft of mealDrafts) {
      mealRows.push({
        ...draft,
        createdByStaffId: assignments[cursor]!,
      });
      cursor += 1;
    }

    for (const draft of marDrafts) {
      marRows.push({
        ...draft,
        createdByStaffId: assignments[cursor]!,
      });
      cursor += 1;
    }
  }

  return {
    mealRows,
    marRows,
    cascadeDate,
    dinnerMissDates: [...dinnerMissDates].sort(),
  };
}

async function ensureEnumValue(enumName: string, enumValue: string): Promise<void> {
  const exists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = $1
        AND e.enumlabel = $2
    ) AS "exists"
    `,
    enumName,
    enumValue
  );

  if (exists[0]?.exists) {
    return;
  }

  await prisma.$executeRawUnsafe(`ALTER TYPE "${enumName}" ADD VALUE '${enumValue}'`);
}

async function ensureRequiredEnums(): Promise<void> {
  await ensureEnumValue("EntrySource", SOURCE);
  await ensureEnumValue("MARStatus", "LATE");
  await ensureEnumValue("MARStatus", "NOT_ADMINISTERED");
}

async function insertMeals(tx: Prisma.TransactionClient, rows: MealRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload = JSON.stringify(
    rows.map((row) => ({
      participantId: row.participantId,
      createdByStaffId: row.createdByStaffId,
      source: row.source,
      timestamp: row.timestamp.toISOString(),
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
      "provenanceHash"
    )
    SELECT
      x."participantId",
      x."createdByStaffId",
      x."source"::"EntrySource",
      x."timestamp"::timestamptz,
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
      x."provenanceHash"
    FROM jsonb_to_recordset($1::jsonb) AS x(
      "participantId" text,
      "createdByStaffId" text,
      "source" text,
      "timestamp" text,
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

async function insertMarRows(tx: Prisma.TransactionClient, rows: MARRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload = JSON.stringify(
    rows.map((row) => ({
      participantId: row.participantId,
      createdByStaffId: row.createdByStaffId,
      source: row.source,
      scheduledAdminTime: row.scheduledAdminTime.toISOString(),
      actualAdminTime: row.actualAdminTime.toISOString(),
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
      "provenanceHash"
    )
    SELECT
      x."participantId",
      x."createdByStaffId",
      x."source"::"EntrySource",
      x."scheduledAdminTime"::timestamptz,
      x."actualAdminTime"::timestamptz,
      x."medicationName",
      x."dosage",
      x."route",
      x."status"::"MARStatus",
      NULLIF(x."omissionReason", ''),
      x."provenanceHash"
    FROM jsonb_to_recordset($1::jsonb) AS x(
      "participantId" text,
      "createdByStaffId" text,
      "source" text,
      "scheduledAdminTime" text,
      "actualAdminTime" text,
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

async function main(): Promise<void> {
  await ensureRequiredEnums();

  const { mealRows, marRows, cascadeDate, dinnerMissDates } = buildLedgerRows();

  await prisma.$transaction(
    async (tx) => {
      await seedParticipantAndStaff(tx);

      await tx.$executeRawUnsafe(
        `DELETE FROM "MealLog" WHERE "participantId" = $1 AND "source" = $2::"EntrySource"`,
        PARTICIPANT.id,
        SOURCE
      );

      await tx.$executeRawUnsafe(
        `DELETE FROM "MARLog" WHERE "participantId" = $1 AND "source" = $2::"EntrySource"`,
        PARTICIPANT.id,
        SOURCE
      );

      await insertMeals(tx, mealRows);
      await insertMarRows(tx, marRows);
    },
    {
      maxWait: 20_000,
      timeout: 120_000,
    }
  );

  console.log("Renato audit generation complete.");
  console.log(
    JSON.stringify(
      {
        participantId: PARTICIPANT.id,
        source: SOURCE,
        window: {
          start: dayKey(START_DATE),
          end: dayKey(END_DATE),
          totalDays: dateRangeInclusive(START_DATE, END_DATE).length,
        },
        staffIds: {
          STAFF_PRIMARY: STAFF_PRIMARY.id,
          STAFF_FLOAT_A: FLOATER_STAFF[0]!.id,
          STAFF_FLOAT_B: FLOATER_STAFF[1]!.id,
          STAFF_FLOAT_C: FLOATER_STAFF[2]!.id,
          STAFF_FLOAT_D: FLOATER_STAFF[3]!.id,
          STAFF_FLOAT_E: FLOATER_STAFF[4]!.id,
        },
        anomalies: {
          dinnerMissDates,
          cascadeDate,
        },
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
