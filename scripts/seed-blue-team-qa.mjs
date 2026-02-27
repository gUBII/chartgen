#!/usr/bin/env node

/**
 * Blue Team Anomaly Detector — Prisma-based QA Data Seeder
 *
 * Creates synthetic NDIS compliance breach data for testing detector triggers.
 * No `psql` required — uses Prisma Client directly.
 *
 * Usage:
 *   node scripts/seed-blue-team-qa.mjs [--clear]
 *
 * Env:
 *   DATABASE_URL (required) — PostgreSQL connection string
 *
 * Output:
 *   - Seeds 3 types of anomalies (Ghost Shift, Restraint, Dehydration)
 *   - Returns participant/staff IDs for use in detector test
 *   - Exits 0 on success, 1 on failure
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CLEAR = process.argv.includes("--clear");
const TEST_SOURCE = "SYNTHETIC_QA";

console.log("🌱 Blue Team Anomaly Detector — QA Data Seeder\n");

async function seedTestData() {
  try {
    // ========================================================================
    // STEP 1: Create Test Fixtures (Participant & Staff)
    // ========================================================================

    console.log("📝 Step 1: Creating test fixtures...\n");

    let testParticipant = await prisma.participant.findFirst({
      where: { fullName: "QA Test Participant" },
    });

    if (!testParticipant) {
      testParticipant = await prisma.participant.create({
        data: {
          fullName: "QA Test Participant",
          externalReference: "QA-TEST-PART-001",
          defaultFoodTexture: 1,
          defaultFluidThickness: 1,
        },
      });
      console.log(`✅ Created participant: ${testParticipant.fullName} (${testParticipant.id})`);
    } else {
      console.log(`✅ Using existing participant: ${testParticipant.fullName}`);
    }

    let testStaff = await prisma.staff.findFirst({
      where: { workerNumber: "QA-STAFF-001" },
    });

    if (!testStaff) {
      testStaff = await prisma.staff.create({
        data: {
          workerNumber: "QA-STAFF-001",
          displayName: "QA Test Worker",
          role: "SUPPORT_WORKER",
        },
      });
      console.log(`✅ Created staff: ${testStaff.displayName} (${testStaff.id})`);
    } else {
      console.log(`✅ Using existing staff: ${testStaff.displayName}`);
    }

    console.log();

    // ========================================================================
    // STEP 2: Seed Ghost Shift Anomaly (CRITICAL)
    // ========================================================================

    console.log("📝 Step 2: Seeding Ghost Shift anomaly...\n");

    // Delete old ghost shift logs if --clear flag set
    if (CLEAR) {
      await prisma.sleepSettlingLog.deleteMany({
        where: { source: TEST_SOURCE },
      });
    }

    const ghostShiftStart = new Date("2026-03-02T22:00:00Z");
    const sleepLogs = [];

    for (let i = 0; i < 6; i++) {
      const checkTime = new Date(ghostShiftStart.getTime() + i * 60 * 60 * 1000);
      sleepLogs.push({
        participantId: testParticipant.id,
        loggedByStaffId: testStaff.id,
        checkTime,
        status: "ASLEEP",
        source: TEST_SOURCE,
      });
    }

    const created = await prisma.sleepSettlingLog.createMany({
      data: sleepLogs,
      skipDuplicates: true,
    });

    console.log(`✅ Created ${created.count} SleepSettlingLog entries (60-min intervals)`);
    console.log(`   Time window: ${ghostShiftStart.toISOString()} to ${sleepLogs[sleepLogs.length - 1].checkTime.toISOString()}`);
    console.log(`   Expected flag: GHOST_SHIFT (CRITICAL) with runLengthChecks=6\n`);

    // ========================================================================
    // STEP 3: Seed Unauthorised Restraint Anomalies (CRITICAL)
    // ========================================================================

    console.log("📝 Step 3: Seeding Unauthorised Restraint anomalies...\n");

    if (CLEAR) {
      await prisma.restrictivePracticeEvent.deleteMany({
        where: { source: TEST_SOURCE },
      });
      await prisma.behaviourSupportPlan.deleteMany({
        where: { source: TEST_SOURCE },
      });
    }

    // 3A: Restraint without BSP (null bspVersionId)
    const restraintNoBsp = await prisma.restrictivePracticeEvent.create({
      data: {
        participantId: testParticipant.id,
        loggedByStaffId: testStaff.id,
        timestamp: new Date("2026-03-03T14:30:00Z"),
        type: "PHYSICAL",
        reason: "Participant aggressive behavior — no BSP on record",
        source: TEST_SOURCE,
      },
    });

    console.log(`✅ Created RestrictivePracticeEvent without BSP`);
    console.log(`   Timestamp: ${restraintNoBsp.timestamp.toISOString()}`);
    console.log(`   Expected flag: UNAUTHORISED_RESTRAINT (CRITICAL, reason=NO_BSP_ON_RECORD)\n`);

    // 3B: Restraint outside BSP active window
    const bsp = await prisma.behaviourSupportPlan.create({
      data: {
        participantId: testParticipant.id,
        activeFrom: new Date("2026-03-01T00:00:00Z"),
        activeTo: new Date("2026-03-05T23:59:59Z"),
        version: 1,
        source: TEST_SOURCE,
      },
    });

    const restraintOutsideWindow = await prisma.restrictivePracticeEvent.create({
      data: {
        participantId: testParticipant.id,
        loggedByStaffId: testStaff.id,
        timestamp: new Date("2026-03-06T10:00:00Z"), // After BSP window
        type: "CHEMICAL",
        reason: "Sedation applied outside authorized window",
        bspVersionId: bsp.id,
        source: TEST_SOURCE,
      },
    });

    console.log(`✅ Created RestrictivePracticeEvent outside BSP window`);
    console.log(`   BSP active: ${bsp.activeFrom.toISOString()} to ${bsp.activeTo.toISOString()}`);
    console.log(`   Event timestamp: ${restraintOutsideWindow.timestamp.toISOString()} (OUTSIDE window)`);
    console.log(`   Expected flag: UNAUTHORISED_RESTRAINT (CRITICAL, reason=OUTSIDE_BSP_ACTIVE_WINDOW)\n`);

    // ========================================================================
    // STEP 4: Seed Silent Dehydration Anomaly (HIGH)
    // ========================================================================

    console.log("📝 Step 4: Seeding Silent Dehydration anomaly...\n");

    if (CLEAR) {
      await prisma.mealLog.deleteMany({
        where: { source: TEST_SOURCE },
      });
      await prisma.bowelFluidLog.deleteMany({
        where: { source: TEST_SOURCE },
      });
      await prisma.shiftNote.deleteMany({
        where: { source: TEST_SOURCE },
      });
    }

    const dehydrationDay = new Date("2026-03-04T00:00:00Z");

    // Low meal intake (< 800ml total)
    const meal1 = await prisma.mealLog.create({
      data: {
        participantId: testParticipant.id,
        createdByStaffId: testStaff.id,
        timestamp: new Date(dehydrationDay.getTime() + 8 * 60 * 60 * 1000), // 08:00
        mealType: "BREAKFAST",
        foodTexture: 1,
        fluidThickness: 1,
        volumeMl: 150,
        amountEaten: "TWENTY_FIVE",
        provenanceHash: "hash-meal-1",
        source: TEST_SOURCE,
      },
    });

    const meal2 = await prisma.mealLog.create({
      data: {
        participantId: testParticipant.id,
        createdByStaffId: testStaff.id,
        timestamp: new Date(dehydrationDay.getTime() + 12 * 60 * 60 * 1000), // 12:00
        mealType: "LUNCH",
        foodTexture: 1,
        fluidThickness: 1,
        volumeMl: 200,
        amountEaten: "FIFTY",
        provenanceHash: "hash-meal-2",
        source: TEST_SOURCE,
      },
    });

    const meal3 = await prisma.mealLog.create({
      data: {
        participantId: testParticipant.id,
        createdByStaffId: testStaff.id,
        timestamp: new Date(dehydrationDay.getTime() + 18 * 60 * 60 * 1000), // 18:00
        mealType: "DINNER",
        foodTexture: 1,
        fluidThickness: 1,
        volumeMl: 250,
        amountEaten: "SEVENTY_FIVE",
        provenanceHash: "hash-meal-3",
        source: TEST_SOURCE,
      },
    });

    console.log(`✅ Created 3 MealLog entries on ${dehydrationDay.toISOString().split("T")[0]}`);
    console.log(`   Volumes: ${meal1.volumeMl}ml + ${meal2.volumeMl}ml + ${meal3.volumeMl}ml = 600ml total`);
    console.log(`   (Below 800ml threshold)`);

    // NO escalation ShiftNote for this day (that's the point of the anomaly)
    console.log(`✅ No escalation ShiftNote created for this day (anomaly trigger)`);
    console.log(`   Expected flag: SILENT_DEHYDRATION (HIGH, totalMl=600, deficitMl=200)\n`);

    // ========================================================================
    // STEP 5: Summary
    // ========================================================================

    console.log("========================================\n");
    console.log("✅ QA Data Seeding Complete\n");
    console.log("Test participant ID: " + testParticipant.id);
    console.log("Test staff ID:       " + testStaff.id);
    console.log("Test source tag:     " + TEST_SOURCE);
    console.log();
    console.log("Next: Run detector endpoint");
    console.log(`  curl -H "Cookie: gwc_session=<cookie>" \\`);
    console.log(`    "http://localhost:3000/api/qa/detect-anomalies?from=2026-03-01&to=2026-03-07"`);
    console.log();
    console.log("Expected anomalies: 4 total");
    console.log("  - 1 × GHOST_SHIFT (CRITICAL)");
    console.log("  - 2 × UNAUTHORISED_RESTRAINT (CRITICAL)");
    console.log("  - 1 × SILENT_DEHYDRATION (HIGH)");
    console.log();

    return { success: true, participantId: testParticipant.id, staffId: testStaff.id };
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    if (error.code === "P1017") {
      console.error("\n⚠️  DATABASE_URL may be invalid or database unreachable.");
      console.error("    Set DATABASE_URL and try again:");
      console.error("    export DATABASE_URL='postgresql://user:pass@host/dbname'");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData().then((result) => {
  if (result.success) {
    process.exit(0);
  }
});
