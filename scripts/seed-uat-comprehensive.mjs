/**
 * Comprehensive UAT Seed Script
 *
 * Creates substantial synthetic test data across ALL chart families:
 *   Meal, MAR, Sleep, BGL, BowelFluid, Hygiene, Community, Repositioning,
 *   RestrictivePractice, ShiftNote, BehaviourSupportPlan
 *
 * Usage:
 *   node scripts/seed-uat-comprehensive.mjs
 *   node scripts/seed-uat-comprehensive.mjs --days 14
 *   node scripts/seed-uat-comprehensive.mjs --apply  (writes to DB; default is dry-run)
 *
 * Requires: DATABASE_URL or DIRECT_URL in .env
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

const prisma = new PrismaClient();

// ─── CLI args ───────────────────────────────────────────────
const args = process.argv.slice(2);
const DAYS = parseInt(args.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "7", 10);
const APPLY = args.includes("--apply");
const SOURCE = "SYNTHETIC_QA";

// ─── Deterministic seed helpers ─────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260228);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
const sha256 = (obj) => createHash("sha256").update(JSON.stringify(obj)).digest("hex");

// ─── Constants ──────────────────────────────────────────────
const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const AMOUNT_EATEN = ["ZERO", "TWENTY_FIVE", "FIFTY", "SEVENTY_FIVE", "ONE_HUNDRED", "REFUSED"];
const SWALLOW_OBS = ["NONE", "COUGHING", "GAGGING", "WATERY_EYES", "THROAT_CLEARING"];
const MAR_STATUSES = ["ADMINISTERED", "REFUSED", "HELD", "LATE", "NOT_ADMINISTERED"];
const SLEEP_STATUSES = ["ASLEEP", "AWAKE", "AGITATED"];
const BOWEL_TYPES = ["BOWEL", "FLUID_IN", "FLUID_OUT"];
const SHIFT_CATEGORIES = ["ROUTINE", "ESCALATION", "INCIDENT_FOLLOWUP", "CLINICAL_HANDOVER"];
const RESTRICTIVE_TYPES = ["CHEMICAL", "PHYSICAL", "MECHANICAL", "ENVIRONMENTAL"];
const COMPLETION_STATUSES = ["COMPLETED", "PARTIAL", "REFUSED", "NOT_APPLICABLE"];
const FASTING_STATUSES = ["FASTING", "NON_FASTING", "UNKNOWN"];
const COMMUNITY_PURPOSES = ["SOCIAL", "MEDICAL", "CAPACITY_BUILDING", "OTHER"];
const TRANSPORT_METHODS = ["WALK", "PUBLIC_TRANSPORT", "TAXI_RIDESHARE", "PROVIDER_VEHICLE", "PRIVATE_VEHICLE"];
const REPOSITION_POSITIONS = ["LEFT_SIDE", "RIGHT_SIDE", "SUPINE", "PRONE", "SEATED"];
const SKIN_OUTCOMES = ["INTACT", "REDNESS", "BREAKDOWN", "PAIN", "UNKNOWN"];
const MEDICATIONS = [
  { name: "Paracetamol", dosage: "500mg", route: "Oral" },
  { name: "Metformin", dosage: "850mg", route: "Oral" },
  { name: "Risperidone", dosage: "1mg", route: "Oral" },
  { name: "Omeprazole", dosage: "20mg", route: "Oral" },
  { name: "Diazepam", dosage: "5mg", route: "Oral" },
];
const MEAL_TIMES = { BREAKFAST: 8, LUNCH: 12, DINNER: 18, SNACK: 15 };
const MAR_SCHEDULED_HOURS = [8, 12, 18, 22];

// ─── Date helpers ───────────────────────────────────────────
const now = new Date();
const startDate = new Date(now);
startDate.setDate(startDate.getDate() - DAYS);

function dayOffset(base, offsetDays, hour = 0, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── Fixture Upsert ─────────────────────────────────────────
async function ensureFixtures() {
  const participants = [];
  const staff = [];

  for (let i = 1; i <= 3; i++) {
    const extRef = `UAT-SEED-PART-${String(i).padStart(3, "0")}`;
    const p = await prisma.participant.upsert({
      where: { externalReference: extRef },
      update: {},
      create: {
        externalReference: extRef,
        fullName: `UAT Participant ${i}`,
        defaultFoodTexture: randInt(1, 7),
        defaultFluidThickness: randInt(0, 4),
      },
    });
    participants.push(p);
  }

  const staffDefs = [
    { wn: "UAT-SEED-SW-001", name: "Seed Support Worker", role: "SUPPORT_WORKER" },
    { wn: "UAT-SEED-SUP-001", name: "Seed Supervisor", role: "SUPERVISOR" },
    { wn: "UAT-SEED-CL-001", name: "Seed Clinical Lead", role: "CLINICAL_LEAD" },
  ];
  for (const sd of staffDefs) {
    const s = await prisma.staff.upsert({
      where: { workerNumber: sd.wn },
      update: {},
      create: { workerNumber: sd.wn, displayName: sd.name, role: sd.role },
    });
    staff.push(s);
  }

  return { participants, staff };
}

// ─── Generators ─────────────────────────────────────────────

function generateMealLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      for (const mt of ["BREAKFAST", "LUNCH", "DINNER"]) {
        const ts = dayOffset(startDate, d, MEAL_TIMES[mt], randInt(0, 30));
        const payload = {
          participantId: p.id,
          createdByStaffId: pick(staff).id,
          source: SOURCE,
          timestamp: ts,
          mealType: mt,
          foodTexture: p.defaultFoodTexture,
          fluidThickness: p.defaultFluidThickness,
          volumeMl: randInt(100, 400),
          amountEaten: pick(AMOUNT_EATEN.filter((a) => a !== "REFUSED")),
          swallowingObservations: rng() > 0.8 ? [pick(SWALLOW_OBS)] : ["NONE"],
          deviationReason: rng() > 0.9 ? "Participant preference" : null,
          provenanceHash: "",
        };
        payload.provenanceHash = sha256(payload);
        logs.push(payload);
      }
      // Random snack 40% of days
      if (rng() > 0.6) {
        const ts = dayOffset(startDate, d, MEAL_TIMES.SNACK, randInt(0, 45));
        const payload = {
          participantId: p.id,
          createdByStaffId: pick(staff).id,
          source: SOURCE,
          timestamp: ts,
          mealType: "SNACK",
          foodTexture: p.defaultFoodTexture,
          fluidThickness: p.defaultFluidThickness,
          volumeMl: randInt(50, 200),
          amountEaten: pick(AMOUNT_EATEN),
          swallowingObservations: ["NONE"],
          deviationReason: null,
          provenanceHash: "",
        };
        payload.provenanceHash = sha256(payload);
        logs.push(payload);
      }
    }
  }
  return logs;
}

function generateMARLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    const meds = [pick(MEDICATIONS), pick(MEDICATIONS)];
    for (let d = 0; d < days; d++) {
      for (const med of meds) {
        for (const hour of MAR_SCHEDULED_HOURS.slice(0, 2)) {
          const scheduled = dayOffset(startDate, d, hour, 0);
          const delayMin = randInt(-5, 30);
          const actual = new Date(scheduled.getTime() + delayMin * 60000);
          const status = rng() > 0.15 ? "ADMINISTERED" : pick(MAR_STATUSES);
          const payload = {
            participantId: p.id,
            createdByStaffId: pick(staff).id,
            source: SOURCE,
            scheduledAdminTime: scheduled,
            actualAdminTime: actual,
            medicationName: med.name,
            dosage: med.dosage,
            route: med.route,
            status,
            omissionReason: status !== "ADMINISTERED" ? "Participant refused" : null,
            provenanceHash: "",
          };
          payload.provenanceHash = sha256(payload);
          logs.push(payload);
        }
      }
    }
  }
  return logs;
}

function generateSleepLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      // Night checks: 22:00, 00:00, 02:00, 04:00, 06:00
      for (const hour of [22, 0, 2, 4, 6]) {
        const offsetDay = hour < 22 ? d + 1 : d;
        const ts = dayOffset(startDate, offsetDay, hour, randInt(0, 15));
        logs.push({
          participantId: p.id,
          loggedByStaffId: pick(staff).id,
          checkTime: ts,
          status: rng() > 0.2 ? "ASLEEP" : pick(SLEEP_STATUSES),
          intervention: rng() > 0.85 ? "Verbal reassurance" : null,
          source: SOURCE,
        });
      }
    }
  }
  return logs;
}

function generateBGLLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      // 2 readings per day (morning fasting + post-lunch)
      for (const [hour, fasting] of [[7, "FASTING"], [14, "NON_FASTING"]]) {
        const ts = dayOffset(startDate, d, hour, randInt(0, 30));
        const reading = 3.5 + rng() * 8;
        const isAnomaly = reading < 4.0 || reading > 10.0;
        logs.push({
          source: "SYNTHETIC_QA",
          participantId: p.id,
          staffId: pick(staff).id,
          localDate: ts.toISOString().slice(0, 10),
          loggedAt: ts,
          bglReadingMmolL: Math.round(reading * 10) / 10,
          fastingStatus: fasting,
          insulinAdministered: rng() > 0.7,
          actionTaken: isAnomaly ? "Notified supervisor" : null,
          qaSeverity: isAnomaly ? "WARN" : "NONE",
          qaAnomalyFlag: isAnomaly,
          qaMeta: isAnomaly ? { reason: reading < 4.0 ? "hypoglycemia" : "hyperglycemia" } : null,
        });
      }
    }
  }
  return logs;
}

function generateBowelFluidLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      // Fluid intake: 3 per day
      for (const hour of [8, 12, 18]) {
        logs.push({
          participantId: p.id,
          loggedByStaffId: pick(staff).id,
          timestamp: dayOffset(startDate, d, hour, randInt(0, 20)),
          type: "FLUID_IN",
          volumeMl: randInt(150, 400),
          bristolScale: null,
          notes: null,
          source: SOURCE,
        });
      }
      // Bowel motion: 0-2 per day
      const bowelCount = randInt(0, 2);
      for (let b = 0; b < bowelCount; b++) {
        logs.push({
          participantId: p.id,
          loggedByStaffId: pick(staff).id,
          timestamp: dayOffset(startDate, d, randInt(6, 20), randInt(0, 59)),
          type: "BOWEL",
          volumeMl: null,
          bristolScale: randInt(1, 7),
          notes: null,
          source: SOURCE,
        });
      }
    }
  }
  return logs;
}

function generateShiftNotes(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      // 1-3 shift notes per day
      const count = randInt(1, 3);
      for (let n = 0; n < count; n++) {
        const cat = rng() > 0.7 ? pick(SHIFT_CATEGORIES) : "ROUTINE";
        logs.push({
          participantId: p.id,
          authoredByStaffId: pick(staff).id,
          category: cat,
          note: `UAT seed note: ${cat.toLowerCase().replace(/_/g, " ")} observation for day ${d + 1}.`,
          source: SOURCE,
          createdAt: dayOffset(startDate, d, randInt(7, 21), randInt(0, 59)),
        });
      }
    }
  }
  return logs;
}

function generateRestrictivePracticeEvents(participants, staff, days) {
  const logs = [];
  // Sparse: ~1 event per participant per 3 days
  for (const p of participants) {
    for (let d = 0; d < days; d += randInt(2, 4)) {
      logs.push({
        participantId: p.id,
        loggedByStaffId: pick(staff).id,
        timestamp: dayOffset(startDate, d, randInt(8, 20), randInt(0, 59)),
        type: pick(RESTRICTIVE_TYPES),
        reason: "UAT seed: behavioural escalation required intervention",
        durationMin: randInt(5, 45),
        bspVersionId: null,
        source: SOURCE,
      });
    }
  }
  return logs;
}

function generateHygieneLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      const ts = dayOffset(startDate, d, randInt(6, 9), randInt(0, 30));
      logs.push({
        source: "SYNTHETIC_QA",
        participantId: p.id,
        staffId: pick(staff).id,
        localDate: ts.toISOString().slice(0, 10),
        loggedAt: ts,
        showerStatus: pick(COMPLETION_STATUSES),
        oralCareStatus: pick(COMPLETION_STATUSES),
        groomingStatus: pick(COMPLETION_STATUSES),
        continenceCareStatus: pick(COMPLETION_STATUSES),
        skinIntegrityChecked: rng() > 0.3 ? "COMPLETED" : "UNKNOWN",
        qaSeverity: "NONE",
        qaAnomalyFlag: false,
        qaMeta: null,
      });
    }
  }
  return logs;
}

function generateCommunityAccessLogs(participants, staff, days) {
  const logs = [];
  // ~every 2-3 days
  for (const p of participants) {
    for (let d = 0; d < days; d += randInt(2, 3)) {
      const departed = dayOffset(startDate, d, randInt(9, 14), randInt(0, 30));
      const duration = randInt(60, 240);
      const returned = new Date(departed.getTime() + duration * 60000);
      logs.push({
        source: "SYNTHETIC_QA",
        participantId: p.id,
        staffId: pick(staff).id,
        localDate: departed.toISOString().slice(0, 10),
        departedAt: departed,
        returnedAt: returned,
        destination: pick(["Local park", "Shopping centre", "Medical clinic", "Community centre", "Cafe"]),
        purpose: pick(COMMUNITY_PURPOSES),
        transportMethod: pick(TRANSPORT_METHODS),
        qaSeverity: "NONE",
        qaAnomalyFlag: false,
        qaMeta: null,
      });
    }
  }
  return logs;
}

function generateRepositioningLogs(participants, staff, days) {
  const logs = [];
  for (const p of participants) {
    for (let d = 0; d < days; d++) {
      // Every 2 hours overnight: 22, 0, 2, 4, 6
      for (const hour of [22, 0, 2, 4, 6]) {
        const offsetDay = hour < 22 ? d + 1 : d;
        const ts = dayOffset(startDate, offsetDay, hour, randInt(0, 15));
        logs.push({
          source: "SYNTHETIC_QA",
          participantId: p.id,
          staffId: pick(staff).id,
          localDate: ts.toISOString().slice(0, 10),
          turnedAt: ts,
          position: pick(REPOSITION_POSITIONS),
          skinCheckOutcome: rng() > 0.1 ? "INTACT" : pick(SKIN_OUTCOMES),
          planIntervalMin: 120,
          qaSeverity: "NONE",
          qaAnomalyFlag: false,
          qaMeta: null,
        });
      }
    }
  }
  return logs;
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Comprehensive UAT Seed ===`);
  console.log(`Mode: ${APPLY ? "APPLY (writing to DB)" : "DRY-RUN (preview only)"}`);
  console.log(`Period: ${DAYS} days back from ${now.toISOString().slice(0, 10)}`);

  const { participants, staff } = await ensureFixtures();
  console.log(`Fixtures: ${participants.length} participants, ${staff.length} staff`);

  const mealLogs = generateMealLogs(participants, staff, DAYS);
  const marLogs = generateMARLogs(participants, staff, DAYS);
  const sleepLogs = generateSleepLogs(participants, staff, DAYS);
  const bglLogs = generateBGLLogs(participants, staff, DAYS);
  const bowelLogs = generateBowelFluidLogs(participants, staff, DAYS);
  const shiftNotes = generateShiftNotes(participants, staff, DAYS);
  const rpEvents = generateRestrictivePracticeEvents(participants, staff, DAYS);
  const hygieneLogs = generateHygieneLogs(participants, staff, DAYS);
  const communityLogs = generateCommunityAccessLogs(participants, staff, DAYS);
  const repoLogs = generateRepositioningLogs(participants, staff, DAYS);

  const summary = {
    MealLog: mealLogs.length,
    MARLog: marLogs.length,
    SleepSettlingLog: sleepLogs.length,
    BglDiabetesLog: bglLogs.length,
    BowelFluidLog: bowelLogs.length,
    ShiftNote: shiftNotes.length,
    RestrictivePracticeEvent: rpEvents.length,
    HygieneLog: hygieneLogs.length,
    CommunityAccessQaLog: communityLogs.length,
    RepositioningQaLog: repoLogs.length,
  };

  console.log(`\nRecord counts:`);
  let total = 0;
  for (const [model, count] of Object.entries(summary)) {
    console.log(`  ${model}: ${count}`);
    total += count;
  }
  console.log(`  TOTAL: ${total}`);

  if (!APPLY) {
    console.log(`\nDry-run complete. Pass --apply to write to database.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\nWriting to database...`);

  await prisma.$transaction(async (tx) => {
    if (mealLogs.length) await tx.mealLog.createMany({ data: mealLogs });
    if (marLogs.length) await tx.mARLog.createMany({ data: marLogs });
    if (sleepLogs.length) await tx.sleepSettlingLog.createMany({ data: sleepLogs });
    if (bglLogs.length) await tx.bglDiabetesLog.createMany({ data: bglLogs });
    if (bowelLogs.length) await tx.bowelFluidLog.createMany({ data: bowelLogs });
    if (shiftNotes.length) await tx.shiftNote.createMany({ data: shiftNotes });
    if (rpEvents.length) await tx.restrictivePracticeEvent.createMany({ data: rpEvents });
    if (hygieneLogs.length) await tx.hygieneLog.createMany({ data: hygieneLogs });
    if (communityLogs.length) await tx.communityAccessQaLog.createMany({ data: communityLogs });
    if (repoLogs.length) await tx.repositioningQaLog.createMany({ data: repoLogs });
  });

  console.log(`Done! ${total} records written across 10 tables.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
