import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const TIMEZONE = "Australia/Sydney";
const PARTICIPANT_ID = "renato-gentili";
const SOURCE = "AUDIT_RECOVERY";
const START_DATE = "2025-09-17";
const END_DATE = "2026-04-07";
const EXPECTED_DAYS = 203;
const CASCADE_DATE = "2026-02-13";
const DINNER_MISS_DATES = ["2025-12-18", "2026-01-17", "2026-04-03"];
const CASCADE_REASON = "Refused morning access/Slept in";

const STAFF_WINDOWS: Record<string, { start: string; end: string }> = {
  "618427": { start: "2025-09-17", end: "2026-04-07" },
  "903551": { start: "2025-09-17", end: "2025-10-31" },
  "274860": { start: "2025-10-01", end: "2025-12-31" },
  "771934": { start: "2025-10-01", end: "2026-04-07" },
  "452108": { start: "2025-11-01", end: "2026-04-07" },
  "689245": { start: "2025-12-01", end: "2026-02-28" },
};
const STAFF_IDS = Object.keys(STAFF_WINDOWS);
const PRIMARY_STAFF_ID = "618427";

type Check = {
  name: string;
  pass: boolean;
  details?: string;
};

type Section = {
  name: string;
  pass: boolean;
  checks: Check[];
  metrics?: Record<string, unknown>;
};

const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const localTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
});

function localDate(date: Date): string {
  return localDateFormatter.format(date);
}

function localMinute(date: Date): number {
  const parts = localTimeFormatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function makeSection(name: string, checks: Check[], metrics?: Record<string, unknown>): Section {
  return {
    name,
    pass: checks.every((check) => check.pass),
    checks,
    metrics,
  };
}

function makeCheck(name: string, pass: boolean, details?: string): Check {
  return { name, pass, details };
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function hashSignature(lines: string[]): string {
  const hash = createHash("sha256");
  for (const line of lines.sort()) {
    hash.update(line);
  }
  return hash.digest("hex");
}

async function verify(): Promise<void> {
  const [
    participants,
    staff,
    meals,
    mars,
    restorationBatchCount,
    restoredMealCandidateCount,
    restoredMarCandidateCount,
    auditEventCount,
    enumRows,
  ] = await Promise.all([
    prisma.participant.findMany({
      select: { id: true, fullName: true, externalReference: true },
      orderBy: { id: "asc" },
    }),
    prisma.staff.findMany({
      select: { id: true, workerNumber: true, displayName: true },
      orderBy: { id: "asc" },
    }),
    prisma.mealLog.findMany({
      select: {
        id: true,
        participantId: true,
        source: true,
        timestamp: true,
        mealType: true,
        volumeMl: true,
        amountEaten: true,
        createdByStaffId: true,
        provenanceHash: true,
      },
    }),
    prisma.mARLog.findMany({
      select: {
        id: true,
        participantId: true,
        source: true,
        scheduledAdminTime: true,
        actualAdminTime: true,
        medicationName: true,
        dosage: true,
        status: true,
        omissionReason: true,
        createdByStaffId: true,
        provenanceHash: true,
      },
    }),
    prisma.restorationBatch.count(),
    prisma.restoredMealCandidate.count(),
    prisma.restoredMARCandidate.count(),
    prisma.auditEvent.count(),
    prisma.$queryRawUnsafe<Array<{ enum_name: string; enum_value: string }>>(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('EntrySource', 'MARStatus')
      ORDER BY t.typname, e.enumsortorder
    `),
  ]);

  const schemaSection = (() => {
    const entrySources = new Set(
      enumRows.filter((row) => row.enum_name === "EntrySource").map((row) => row.enum_value)
    );
    const marStatuses = new Set(enumRows.filter((row) => row.enum_name === "MARStatus").map((row) => row.enum_value));

    const checks: Check[] = [
      makeCheck("EntrySource includes AUDIT_RECOVERY", entrySources.has("AUDIT_RECOVERY")),
      makeCheck("MARStatus includes LATE", marStatuses.has("LATE")),
      makeCheck("MARStatus includes NOT_ADMINISTERED", marStatuses.has("NOT_ADMINISTERED")),
    ];

    return makeSection("schema_enums", checks, {
      entrySources: [...entrySources],
      marStatuses: [...marStatuses],
    });
  })();

  const isolationSection = (() => {
    const participantIds = participants.map((p) => p.id);
    const staffIds = staff.map((s) => s.id);

    const mealOutsideParticipantOrSource = meals.filter(
      (row) => row.participantId !== PARTICIPANT_ID || row.source !== SOURCE
    ).length;
    const marOutsideParticipantOrSource = mars.filter(
      (row) => row.participantId !== PARTICIPANT_ID || row.source !== SOURCE
    ).length;

    const checks: Check[] = [
      makeCheck("Exactly 1 participant", participants.length === 1, `actual=${participants.length}`),
      makeCheck(
        "Participant is renato-gentili",
        participants.length === 1 && participants[0]!.id === PARTICIPANT_ID,
        `actual=${participantIds.join(",")}`
      ),
      makeCheck("Exactly 6 staff records", staff.length === 6, `actual=${staff.length}`),
      makeCheck(
        "Staff IDs match required roster",
        staffIds.length === STAFF_IDS.length && staffIds.every((id) => STAFF_IDS.includes(id)),
        `actual=${staffIds.join(",")}`
      ),
      makeCheck("RestorationBatch is empty", restorationBatchCount === 0, `actual=${restorationBatchCount}`),
      makeCheck(
        "RestoredMealCandidate is empty",
        restoredMealCandidateCount === 0,
        `actual=${restoredMealCandidateCount}`
      ),
      makeCheck(
        "RestoredMARCandidate is empty",
        restoredMarCandidateCount === 0,
        `actual=${restoredMarCandidateCount}`
      ),
      makeCheck("AuditEvent is empty", auditEventCount === 0, `actual=${auditEventCount}`),
      makeCheck(
        "All meal rows belong to Renato/AUDIT_RECOVERY",
        mealOutsideParticipantOrSource === 0,
        `violations=${mealOutsideParticipantOrSource}`
      ),
      makeCheck(
        "All MAR rows belong to Renato/AUDIT_RECOVERY",
        marOutsideParticipantOrSource === 0,
        `violations=${marOutsideParticipantOrSource}`
      ),
    ];

    return makeSection("dataset_isolation", checks, {
      participants: participantIds,
      staffIds,
      mealCount: meals.length,
      marCount: mars.length,
    });
  })();

  const timelineSection = (() => {
    const mealDays = meals.map((row) => localDate(row.timestamp));
    const marDays = mars.map((row) => localDate(row.scheduledAdminTime));
    const allDays = [...new Set([...mealDays, ...marDays])].sort();

    const firstDay = allDays[0] ?? null;
    const lastDay = allDays[allDays.length - 1] ?? null;
    const outsideDays = allDays.filter((day) => day < START_DATE || day > END_DATE);

    const checks: Check[] = [
      makeCheck("Timeline starts on 2025-09-17", firstDay === START_DATE, `actual=${String(firstDay)}`),
      makeCheck("Timeline ends on 2026-04-07", lastDay === END_DATE, `actual=${String(lastDay)}`),
      makeCheck("Timeline covers exactly 203 days", allDays.length === EXPECTED_DAYS, `actual=${allDays.length}`),
      makeCheck("No local dates outside window", outsideDays.length === 0, `outside=${outsideDays.join(",")}`),
    ];

    return makeSection("timeline_timezone", checks, {
      firstDay,
      lastDay,
      dayCount: allDays.length,
      timezone: TIMEZONE,
    });
  })();

  const staffingSection = (() => {
    const combined = [
      ...meals.map((row) => ({
        localDay: localDate(row.timestamp),
        staffId: row.createdByStaffId,
        label: `meal:${row.id}`,
      })),
      ...mars.map((row) => ({
        localDay: localDate(row.scheduledAdminTime),
        staffId: row.createdByStaffId,
        label: `mar:${row.id}`,
      })),
    ];

    const windowViolations = combined.filter((row) => {
      const window = STAFF_WINDOWS[row.staffId];
      if (!window) {
        return true;
      }
      return row.localDay < window.start || row.localDay > window.end;
    });

    const dayStats = new Map<string, { total: number; primary: number }>();
    for (const row of combined) {
      const current = dayStats.get(row.localDay) ?? { total: 0, primary: 0 };
      current.total += 1;
      if (row.staffId === PRIMARY_STAFF_ID) {
        current.primary += 1;
      }
      dayStats.set(row.localDay, current);
    }

    const primaryMismatches = [...dayStats.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(([, stats]) => stats.primary !== Math.round(stats.total * 0.4))
      .map(([day, stats]) => ({
        day,
        total: stats.total,
        primary: stats.primary,
        target: Math.round(stats.total * 0.4),
      }));

    const checks: Check[] = [
      makeCheck("No staff window violations", windowViolations.length === 0, `violations=${windowViolations.length}`),
      makeCheck(
        "Daily primary count equals round(total * 0.4)",
        primaryMismatches.length === 0,
        `mismatches=${primaryMismatches.length}`
      ),
    ];

    return makeSection("staffing_compliance", checks, {
      primaryMismatchDays: primaryMismatches.slice(0, 10),
      windowViolationSamples: windowViolations.slice(0, 10),
    });
  })();

  const clinicalSection = (() => {
    const dinnerMeds = new Set(["Sodium Valproate", "Atorvastatin"]);
    const expectedAnomalyStaff = [
      { day: "2025-12-18", medication: "Sodium Valproate", dosage: "500mg", minute: 20 * 60, status: "NOT_ADMINISTERED", staffId: "618427" },
      { day: "2025-12-18", medication: "Atorvastatin", dosage: "80mg", minute: 20 * 60, status: "NOT_ADMINISTERED", staffId: "689245" },
      { day: "2026-01-17", medication: "Sodium Valproate", dosage: "500mg", minute: 20 * 60, status: "NOT_ADMINISTERED", staffId: "689245" },
      { day: "2026-01-17", medication: "Atorvastatin", dosage: "80mg", minute: 20 * 60, status: "NOT_ADMINISTERED", staffId: "771934" },
      { day: "2026-04-03", medication: "Sodium Valproate", dosage: "500mg", minute: 20 * 60, status: "NOT_ADMINISTERED", staffId: "618427" },
      { day: "2026-04-03", medication: "Atorvastatin", dosage: "80mg", minute: 20 * 60, status: "NOT_ADMINISTERED", staffId: "618427" },
      { day: "2026-02-13", medication: "Citalopram", dosage: "20mg", minute: 12 * 60 + 30, status: "LATE", staffId: "771934" },
      { day: "2026-02-13", medication: "Sodium Valproate", dosage: "500mg", minute: 12 * 60 + 30, status: "LATE", staffId: "689245" },
      { day: "2026-02-13", medication: "Aspirin", dosage: "100mg", minute: 12 * 60 + 30, status: "LATE", staffId: "618427" },
      { day: "2026-02-13", medication: "Sodium Valproate", dosage: "500mg", minute: 21 * 60 + 15, status: "ADMINISTERED", staffId: "618427" },
      { day: "2026-02-13", medication: "Atorvastatin", dosage: "80mg", minute: 21 * 60 + 15, status: "ADMINISTERED", staffId: "618427" },
    ] as const;

    const dinnerMissRows = mars.filter(
      (row) => row.status === "NOT_ADMINISTERED" && dinnerMeds.has(row.medicationName)
    );

    const dinnerByDay = new Map<string, number>();
    for (const row of dinnerMissRows) {
      const day = localDate(row.scheduledAdminTime);
      dinnerByDay.set(day, (dinnerByDay.get(day) ?? 0) + 1);
    }

    const dinnerDays = [...dinnerByDay.keys()].sort();

    const lateRows = mars.filter((row) => row.status === "LATE");
    const lateDays = [...new Set(lateRows.map((row) => localDate(row.scheduledAdminTime)))].sort();
    const lateMeds = [...new Set(lateRows.map((row) => row.medicationName))].sort();

    const cascadeEveningRoutine = mars.filter((row) => {
      const day = localDate(row.scheduledAdminTime);
      const minute = localMinute(row.scheduledAdminTime);
      return day === CASCADE_DATE && minute === 21 * 60 + 15 && dinnerMeds.has(row.medicationName);
    });

    const olanzapineRows = mars.filter((row) => row.medicationName === "Olanzapine" && row.dosage === "2.5mg");
    const olanzByDay = new Map<string, number>();
    for (const row of olanzapineRows) {
      const day = localDate(row.scheduledAdminTime);
      olanzByDay.set(day, (olanzByDay.get(day) ?? 0) + 1);
    }

    const olanzInvalidDailyCounts = [...olanzByDay.entries()].filter(([, count]) => ![0, 3].includes(count));
    const olanzDaysWithUse = [...olanzByDay.values()].filter((count) => count === 3).length;

    const olanzInvalidTimes = olanzapineRows.filter((row) => {
      const day = localDate(row.scheduledAdminTime);
      const minute = localMinute(row.scheduledAdminTime);

      const inMorning = inRange(minute, 510, 690);
      const inLunch = inRange(minute, 750, 930);
      const inDinner = inRange(minute, 1050, 1230);

      if (day === CASCADE_DATE) {
        return !(inMorning || minute === 14 * 60 || minute === 21 * 60 + 15);
      }

      return !(inMorning || inLunch || inDinner);
    });

    const cbdRows = mars.filter((row) => row.medicationName === "CBD Oil");
    const cbdInvalidTimes = cbdRows.filter((row) => {
      const day = localDate(row.scheduledAdminTime);
      const minute = localMinute(row.scheduledAdminTime);
      if (day === CASCADE_DATE) {
        return minute !== 21 * 60 + 15;
      }
      return !inRange(minute, 16 * 60, 21 * 60);
    });

    const lateMorningMinuteViolations = lateRows.filter(
      (row) => localMinute(row.scheduledAdminTime) !== 12 * 60 + 30
    );

    const lateReasonViolations = lateRows.filter((row) => row.omissionReason !== CASCADE_REASON);

    const anomalyStaffViolations = expectedAnomalyStaff.filter((expected) => {
      const matches = mars.filter((row) => {
        return (
          localDate(row.scheduledAdminTime) === expected.day &&
          localMinute(row.scheduledAdminTime) === expected.minute &&
          row.medicationName === expected.medication &&
          row.dosage === expected.dosage &&
          row.status === expected.status &&
          row.createdByStaffId === expected.staffId
        );
      });
      return matches.length !== 1;
    });

    const checks: Check[] = [
      makeCheck("Meal row count is exactly 812", meals.length === 812, `actual=${meals.length}`),
      makeCheck(
        "Dinner miss count is exactly 6",
        dinnerMissRows.length === 6,
        `actual=${dinnerMissRows.length}`
      ),
      makeCheck(
        "Dinner miss dates match locked dates",
        dinnerDays.length === DINNER_MISS_DATES.length &&
          dinnerDays.every((day, index) => day === DINNER_MISS_DATES[index]),
        `actual=${dinnerDays.join(",")}`
      ),
      makeCheck(
        "Each dinner miss date has exactly 2 rows",
        [...dinnerByDay.values()].every((count) => count === 2),
        `counts=${JSON.stringify(Object.fromEntries(dinnerByDay))}`
      ),
      makeCheck("Late row count is exactly 3", lateRows.length === 3, `actual=${lateRows.length}`),
      makeCheck(
        "All late rows are on cascade date",
        lateDays.length === 1 && lateDays[0] === CASCADE_DATE,
        `actual=${lateDays.join(",")}`
      ),
      makeCheck(
        "Late meds are Citalopram/Sodium Valproate/Aspirin",
        lateMeds.join(",") === ["Aspirin", "Citalopram", "Sodium Valproate"].join(","),
        `actual=${lateMeds.join(",")}`
      ),
      makeCheck(
        "Late rows are scheduled at 12:30 local",
        lateMorningMinuteViolations.length === 0,
        `violations=${lateMorningMinuteViolations.length}`
      ),
      makeCheck(
        "Late rows use required cascade reason",
        lateReasonViolations.length === 0,
        `violations=${lateReasonViolations.length}`
      ),
      makeCheck(
        "Anomaly staff assignments match locked mapping",
        anomalyStaffViolations.length === 0,
        `violations=${anomalyStaffViolations.length}`
      ),
      makeCheck(
        "Cascade evening routine meds occur at 21:15 local",
        cascadeEveningRoutine.length === 2,
        `actual=${cascadeEveningRoutine.length}`
      ),
      makeCheck(
        "Olanzapine appears on ~90% days",
        olanzDaysWithUse >= 170 && olanzDaysWithUse <= 195,
        `daysWithUse=${olanzDaysWithUse}`
      ),
      makeCheck(
        "Olanzapine rows are 3-per-day when present",
        olanzInvalidDailyCounts.length === 0,
        `violations=${olanzInvalidDailyCounts.length}`
      ),
      makeCheck(
        "Olanzapine times match expected windows",
        olanzInvalidTimes.length === 0,
        `violations=${olanzInvalidTimes.length}`
      ),
      makeCheck(
        "CBD usage frequency is in expected band",
        cbdRows.length >= 15 && cbdRows.length <= 45,
        `actual=${cbdRows.length}`
      ),
      makeCheck("CBD times match expected windows", cbdInvalidTimes.length === 0, `violations=${cbdInvalidTimes.length}`),
    ];

    return makeSection("clinical_logic", checks, {
      dinnerMissDates: dinnerDays,
      lateDays,
      lateMeds,
      olanzapineDaysWithUse: olanzDaysWithUse,
      cbdCount: cbdRows.length,
    });
  })();

  const idempotencySection = (() => {
    const mealIdSet = new Set(meals.map((row) => row.id));
    const marIdSet = new Set(mars.map((row) => row.id));

    const signature = hashSignature([
      ...meals.map(
        (row) =>
          `meal|${row.id}|${row.timestamp.toISOString()}|${row.mealType}|${row.volumeMl}|${row.amountEaten}|${row.createdByStaffId}|${row.provenanceHash}`
      ),
      ...mars.map(
        (row) =>
          `mar|${row.id}|${row.scheduledAdminTime.toISOString()}|${row.actualAdminTime.toISOString()}|${row.medicationName}|${row.dosage}|${row.status}|${row.omissionReason ?? ""}|${row.createdByStaffId}|${row.provenanceHash}`
      ),
    ]);

    const checks: Check[] = [
      makeCheck("Meal IDs are unique", mealIdSet.size === meals.length, `unique=${mealIdSet.size} total=${meals.length}`),
      makeCheck("MAR IDs are unique", marIdSet.size === mars.length, `unique=${marIdSet.size} total=${mars.length}`),
      makeCheck("Dataset signature generated", signature.length === 64),
    ];

    return makeSection("idempotency_signature", checks, {
      signature,
    });
  })();

  const sections: Section[] = [
    schemaSection,
    isolationSection,
    timelineSection,
    staffingSection,
    clinicalSection,
    idempotencySection,
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    overallPass: sections.every((section) => section.pass),
    sections,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.overallPass) {
    process.exitCode = 1;
  }
}

verify()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
