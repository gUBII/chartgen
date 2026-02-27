#!/usr/bin/env node

/**
 * Blue Team Anomaly Detector — QA Validation (No DB Seed Required)
 *
 * Assumes seed data already exists. Simply calls the detector endpoint
 * and validates 3/3 detector paths return expected anomalies.
 *
 * Usage:
 *   node scripts/validate-blue-team-qa.mjs \
 *     --url http://localhost:3000 \
 *     --cookie <gwc_session> \
 *     [--from 2026-03-01] [--to 2026-03-07]
 *
 * Env (alternative to CLI args):
 *   BASE_URL, SESSION_COOKIE, TEST_FROM, TEST_TO
 */

import { parseArgs } from "node:util";

const args = parseArgs({
  options: {
    url: { type: "string", short: "u" },
    cookie: { type: "string", short: "c" },
    from: { type: "string" },
    to: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (args.values.help) {
  console.log(`
Usage: node scripts/validate-blue-team-qa.mjs [options]

Options:
  --url <url>         Base URL (default: http://localhost:3000)
  --cookie <cookie>   Session cookie (gwc_session value)
  --from <date>       Start date (default: 2026-03-01)
  --to <date>         End date (default: 2026-03-07)
  --help              Show this help

Environment:
  BASE_URL, SESSION_COOKIE, TEST_FROM, TEST_TO (override CLI args)

Example:
  node scripts/validate-blue-team-qa.mjs --url http://localhost:3000 --cookie abc123
  `);
  process.exit(0);
}

const BASE_URL = args.values.url || process.env.BASE_URL || "http://localhost:3000";
const SESSION_COOKIE = args.values.cookie || process.env.SESSION_COOKIE;
const TEST_FROM = args.values.from || process.env.TEST_FROM || "2026-03-01";
const TEST_TO = args.values.to || process.env.TEST_TO || "2026-03-07";

if (!SESSION_COOKIE) {
  console.error("❌ Missing required argument: --cookie <gwc_session>\n");
  console.error("Get session cookie from login:");
  console.error("  curl -X POST http://localhost:3000/api/auth/login \\");
  console.error("    -H 'Content-Type: application/json' \\");
  console.error("    -d '{\"password\":\"<SITE_PASSWORD>\"}'");
  process.exit(1);
}

console.log("🔍 Blue Team Anomaly Detector — QA Validation\n");
console.log(`Base URL: ${BASE_URL}`);
console.log(`Window: ${TEST_FROM} to ${TEST_TO}`);
console.log(`Auth: gwc_session=${SESSION_COOKIE.substring(0, 10)}...\n`);

// ============================================================================
// Call Detector Endpoint
// ============================================================================

console.log("📡 Calling /api/qa/detect-anomalies...\n");

async function validateDetector() {
  try {
    const response = await fetch(
      `${BASE_URL}/api/qa/detect-anomalies?from=${TEST_FROM}&to=${TEST_TO}`,
      {
        method: "GET",
        headers: {
          Cookie: `gwc_session=${SESSION_COOKIE}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error(`   Response: ${text}`);

      if (response.status === 401) {
        console.error("\n⚠️  Session cookie may be invalid or expired.");
        console.error("   Re-authenticate: curl -X POST .../api/auth/login");
      } else if (response.status === 404) {
        console.error(`\n⚠️  Route not found. Endpoint: ${BASE_URL}/api/qa/detect-anomalies`);
        console.error("   Is the dev server running with latest build?");
      }

      return null;
    }

    const result = await response.json();

    if (!result.ok) {
      console.error(`❌ API error: ${result.error}`);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error(`❌ Network error: ${error.message}`);
    console.error(`   Base URL: ${BASE_URL}`);
    console.error(`   Is the dev server running?`);
    return null;
  }
}

const data = await validateDetector();

if (!data) {
  console.log("\n❌ Validation failed.\n");
  process.exit(1);
}

// ============================================================================
// Verify Detector Responses
// ============================================================================

console.log(`✅ Detector returned ${data.anomalies.length} anomalies\n`);

const expectations = [
  {
    name: "Ghost Shift",
    flagType: "GHOST_SHIFT",
    severity: "CRITICAL",
    minCount: 1,
    validate: (flag) => {
      const d = flag.detail;
      return (
        d.runLengthChecks !== undefined &&
        d.runStart !== undefined &&
        d.runEnd !== undefined &&
        d.intervalMinutes === 60
      );
    },
  },
  {
    name: "Unauthorised Restraint",
    flagType: "UNAUTHORISED_RESTRAINT",
    severity: "CRITICAL",
    minCount: 2,
    validate: (flag) => {
      const d = flag.detail;
      return d.reason !== undefined && (d.reason === "NO_BSP_ON_RECORD" || d.reason === "OUTSIDE_BSP_ACTIVE_WINDOW");
    },
  },
  {
    name: "Silent Dehydration",
    flagType: "SILENT_DEHYDRATION",
    severity: "HIGH",
    minCount: 1,
    validate: (flag) => {
      const d = flag.detail;
      return d.day !== undefined && d.totalMl !== undefined && d.totalMl < 800;
    },
  },
];

let passCount = 0;
let failCount = 0;

for (const exp of expectations) {
  const flags = data.anomalies.filter((f) => f.flagType === exp.flagType);

  // Check count
  if (flags.length < exp.minCount) {
    console.log(`❌ ${exp.name}: Expected ≥${exp.minCount}, got ${flags.length}`);
    failCount++;
    continue;
  }

  // Check severity
  if (!flags.every((f) => f.severity === exp.severity)) {
    console.log(`❌ ${exp.name}: Not all flags have severity ${exp.severity}`);
    failCount++;
    continue;
  }

  // Validate detail fields
  if (!flags.every((f) => exp.validate(f))) {
    console.log(`❌ ${exp.name}: Detail fields don't match expected structure`);
    failCount++;
    continue;
  }

  console.log(`✅ ${exp.name}`);
  console.log(`   Count: ${flags.length}/${exp.minCount} required`);
  console.log(`   Severity: ${exp.severity}`);

  const first = flags[0];
  console.log(`   Participant: ${first.participantName}`);
  console.log(`   Staff: ${first.staffName}`);
  console.log(`   Detail: ${JSON.stringify(first.detail)}`);
  console.log();

  passCount++;
}

// ============================================================================
// Summary
// ============================================================================

console.log("========================================\n");

if (failCount === 0) {
  console.log(`✅ QA VALIDATION PASS: ${passCount}/3 detectors triggered\n`);
  console.log("Detector evidence:");
  console.log(`- Ghost Shift: ✅ FALSE POSITIVES detected`);
  console.log(`- Unauthorised Restraint: ✅ POLICY VIOLATIONS detected`);
  console.log(`- Silent Dehydration: ✅ CARE GAPS detected\n`);
  console.log("Endpoint is QA-verified and ready for integration.\n");
  process.exit(0);
} else {
  console.log(`⚠️  QA VALIDATION INCOMPLETE: ${passCount} PASS, ${failCount} FAIL\n`);
  console.log("Missing detector triggers. Common causes:");
  console.log("1. Seed data not created (run: node scripts/seed-blue-team-qa.mjs)");
  console.log("2. Date range doesn't include seeded data (default: 2026-03-01 to 2026-03-07)");
  console.log("3. Detector logic bug or query mismatch\n");
  process.exit(1);
}
