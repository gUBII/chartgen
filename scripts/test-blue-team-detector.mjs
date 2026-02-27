#!/usr/bin/env node

/**
 * Blue Team Anomaly Detector — Live QA Test Script
 *
 * Seeds synthetic NDIS compliance breaches and verifies detector responses:
 * - GHOST_SHIFT: Sleep logs with exact 60-minute intervals
 * - UNAUTHORISED_RESTRAINT: Restraint events without/outside BSP
 * - SILENT_DEHYDRATION: Low fluid intake (<800ml/24h) with no escalation
 *
 * Usage:
 *   SITE_PASSWORD=free node scripts/test-blue-team-detector.mjs [--base-url=http://localhost:3000]
 *   or
 *   FULL_USER_CREDENTIALS='[{\"username\":\"admin\",\"password\":\"secret\"}]' LOGIN_USERNAME=admin LOGIN_PASSWORD=secret node scripts/test-blue-team-detector.mjs
 */

import { execSync } from "node:child_process";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || "";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || process.env.SITE_PASSWORD || "";
let SESSION_COOKIE = process.env.SESSION_COOKIE || "";

const TEST_DATE_FROM = "2026-03-01";
const TEST_DATE_TO = "2026-03-07";

console.log("🧪 Blue Team Anomaly Detector — QA Test Suite\n");
console.log(`Base URL: ${BASE_URL}`);
console.log(`Test window: ${TEST_DATE_FROM} to ${TEST_DATE_TO}\n`);

async function ensureSessionCookie() {
  if (SESSION_COOKIE) return SESSION_COOKIE;

  if (!LOGIN_PASSWORD) {
    console.error("❌ Missing auth. Set SESSION_COOKIE or LOGIN_PASSWORD/SITE_PASSWORD.");
    return null;
  }

  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "full",
      username: LOGIN_USERNAME || undefined,
      password: LOGIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`❌ Login failed: HTTP ${response.status} ${response.statusText}`);
    console.error(body);
    return null;
  }

  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/gwc_session=([^;]+)/);
  if (!match?.[1]) {
    console.error("❌ Login succeeded but gwc_session cookie missing in response.");
    return null;
  }

  SESSION_COOKIE = match[1];
  return SESSION_COOKIE;
}

// ============================================================================
// PHASE 1: Seed Synthetic Anomalies
// ============================================================================

console.log("📝 PHASE 1: Seeding Synthetic Anomalies\n");

const seedCommands = [
  {
    name: "Ghost Shift",
    description: "SleepSettlingLog with exact 60-min intervals (4 entries)",
    sql: `
      INSERT INTO "SleepSettlingLog" (id, "participantId", "loggedByStaffId", "checkTime", status, source, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        (SELECT id FROM "Participant" LIMIT 1),
        (SELECT id FROM "Staff" LIMIT 1),
        TIMESTAMP '2026-03-02 22:00:00' + (INTERVAL '60 minutes' * gs.num),
        'ASLEEP',
        'SYNTHETIC_QA',
        NOW(),
        NOW()
      FROM GENERATE_SERIES(0, 5) AS gs(num);
    `,
  },
  {
    name: "Unauthorised Restraint (No BSP)",
    description: "RestrictivePracticeEvent with NULL bspVersionId",
    sql: `
      INSERT INTO "RestrictivePracticeEvent" (id, "participantId", "loggedByStaffId", timestamp, type, reason, "bspVersionId", source, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        (SELECT id FROM "Participant" LIMIT 1),
        (SELECT id FROM "Staff" LIMIT 1),
        TIMESTAMP '2026-03-03 14:30:00',
        'PHYSICAL',
        'Participant aggressive behavior',
        NULL,
        'SYNTHETIC_QA',
        NOW(),
        NOW()
      );
    `,
  },
  {
    name: "Unauthorised Restraint (Outside Window)",
    description: "RestrictivePracticeEvent outside BSP active dates",
    sql: `
      WITH bsp AS (
        INSERT INTO "BehaviourSupportPlan" (id, "participantId", "activeFrom", "activeTo", version, source, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          (SELECT id FROM "Participant" LIMIT 1),
          TIMESTAMP '2026-03-01 00:00:00',
          TIMESTAMP '2026-03-05 23:59:59',
          1,
          'SYNTHETIC_QA',
          NOW(),
          NOW()
        )
        RETURNING id
      )
      INSERT INTO "RestrictivePracticeEvent" (id, "participantId", "loggedByStaffId", timestamp, type, reason, "bspVersionId", source, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        (SELECT id FROM "Participant" LIMIT 1),
        (SELECT id FROM "Staff" LIMIT 1),
        TIMESTAMP '2026-03-06 10:00:00',
        'CHEMICAL',
        'Sedation for agitation',
        id,
        'SYNTHETIC_QA',
        NOW(),
        NOW()
      FROM bsp;
    `,
  },
  {
    name: "Silent Dehydration (Low Intake)",
    description: "MealLog + BowelFluidLog < 800ml with no escalation note",
    sql: `
      INSERT INTO "MealLog" (id, "participantId", "createdByStaffId", timestamp, "mealType", "foodTexture", "fluidThickness", "volumeMl", "amountEaten", source, "provenanceHash", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), (SELECT id FROM "Participant" LIMIT 1), (SELECT id FROM "Staff" LIMIT 1), TIMESTAMP '2026-03-04 08:00:00', 'BREAKFAST', 1, 1, 150, 'TWENTY_FIVE', 'SYNTHETIC_QA', 'hash1', NOW(), NOW()),
        (gen_random_uuid(), (SELECT id FROM "Participant" LIMIT 1), (SELECT id FROM "Staff" LIMIT 1), TIMESTAMP '2026-03-04 12:00:00', 'LUNCH', 1, 1, 200, 'FIFTY', 'SYNTHETIC_QA', 'hash2', NOW(), NOW()),
        (gen_random_uuid(), (SELECT id FROM "Participant" LIMIT 1), (SELECT id FROM "Staff" LIMIT 1), TIMESTAMP '2026-03-04 18:00:00', 'DINNER', 1, 1, 250, 'SEVENTY_FIVE', 'SYNTHETIC_QA', 'hash3', NOW(), NOW());
    `,
  },
];

for (const { name, description, sql } of seedCommands) {
  try {
    execSync(
      `psql "$DATABASE_URL" -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { stdio: "pipe" }
    );
    console.log(`✅ ${name}: ${description}`);
  } catch (error) {
    console.log(`⚠️  ${name}: Skipped (likely missing fixture data or DB connection)`);
  }
}

console.log("\n");

// ============================================================================
// PHASE 2: Call Detector Endpoint
// ============================================================================

console.log("🔍 PHASE 2: Running Anomaly Detection\n");

async function detectAnomalies() {
  try {
    const cookie = await ensureSessionCookie();
    if (!cookie) return null;

    const response = await fetch(
      `${BASE_URL}/api/qa/detect-anomalies?from=${TEST_DATE_FROM}&to=${TEST_DATE_TO}`,
      {
        method: "GET",
        headers: {
          Cookie: `gwc_session=${cookie}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    console.error(`   (Is dev server running at ${BASE_URL}?)`);
    return null;
  }
}

const result = await detectAnomalies();

if (!result) {
  console.log("\n❌ Detection failed. Exiting.\n");
  process.exit(1);
}

console.log(`✅ Detection completed at ${result.data.ranAt}`);
console.log(`   Window: ${result.data.window.from} to ${result.data.window.to}`);
console.log(`   Total anomalies: ${result.data.summary.total}\n`);

// ============================================================================
// PHASE 3: Verify Detector Responses
// ============================================================================

console.log("✓ PHASE 3: Verifying Detector Responses\n");

const expectations = [
  {
    name: "Ghost Shift",
    flagType: "GHOST_SHIFT",
    severity: "CRITICAL",
    minCount: 1,
    detailFields: ["runLengthChecks", "runStart", "runEnd", "intervalMinutes"],
  },
  {
    name: "Unauthorised Restraint",
    flagType: "UNAUTHORISED_RESTRAINT",
    severity: "CRITICAL",
    minCount: 2,
    detailFields: ["reason"],
  },
  {
    name: "Silent Dehydration",
    flagType: "SILENT_DEHYDRATION",
    severity: "HIGH",
    minCount: 1,
    detailFields: ["day", "totalMl", "thresholdMl", "deficitMl"],
  },
];

let passCount = 0;
let failCount = 0;

for (const exp of expectations) {
  const flags = result.data.anomalies.filter((f) => f.flagType === exp.flagType);

  if (flags.length < exp.minCount) {
    console.log(`❌ ${exp.name}: Expected ≥${exp.minCount}, got ${flags.length}`);
    failCount++;
    continue;
  }

  const firstFlag = flags[0];

  // Verify severity
  if (firstFlag.severity !== exp.severity) {
    console.log(`❌ ${exp.name}: Expected severity ${exp.severity}, got ${firstFlag.severity}`);
    failCount++;
    continue;
  }

  // Verify required detail fields
  const missingFields = exp.detailFields.filter((f) => !(f in firstFlag.detail));
  if (missingFields.length > 0) {
    console.log(
      `❌ ${exp.name}: Missing detail fields: ${missingFields.join(", ")}`
    );
    failCount++;
    continue;
  }

  console.log(`✅ ${exp.name}: ${flags.length} flag(s) detected`);
  console.log(`   - Severity: ${firstFlag.severity}`);
  console.log(`   - Participant: ${firstFlag.participantName}`);
  console.log(`   - Staff: ${firstFlag.staffName}`);
  console.log(`   - Detail: ${JSON.stringify(firstFlag.detail)}`);
  console.log();

  passCount++;
}

// ============================================================================
// Summary
// ============================================================================

console.log("========================================\n");

if (failCount === 0) {
  console.log(`✅ All detector paths verified: ${passCount}/${expectations.length} PASS\n`);
  process.exit(0);
} else {
  console.log(
    `⚠️  Verification incomplete: ${passCount} PASS, ${failCount} FAIL\n`
  );
  process.exit(1);
}
