# Blue Team Anomaly Detector — QA Testing Guide

## Overview

This document outlines the live QA testing procedure for the Blue Team Anomaly Detector.
The detector identifies three types of NDIS compliance breaches via `/api/qa/detect-anomalies`.

**Test Coverage:**
- ✅ Ghost Shift Flag (CRITICAL) — falsified sleep logs
- ✅ Unauthorised Restraint Flag (CRITICAL) — unsanctioned/out-of-window restraints
- ✅ Silent Dehydration Flag (HIGH) — low intake with no escalation

---

## Prerequisites

1. **Database Access**
   - PostgreSQL instance with Chartgen schema (run `npx prisma migrate deploy`)
   - `DATABASE_URL` env var set
   - Test participants and staff exist (run seed: `npx prisma db seed` if available)

2. **Chartgen Dev Server**
   - Running: `npm run dev` (listens on port 3000)
   - Auth: Valid session cookie (see login procedure below)

3. **Node.js**
   - Version 18+ (for `node scripts/test-blue-team-detector.mjs`)

---

## Test Setup

### Step 1: Authenticate

Get a session cookie from the login endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"<SITE_PASSWORD>"}' \
  -c /tmp/cookies.txt

# Extract session cookie from response headers (Set-Cookie: gwc_session=...)
COOKIE=$(cat /tmp/cookies.txt | grep gwc_session | awk '{print $NF}')
export SESSION_COOKIE=$COOKIE
```

Or use a pre-existing session cookie if you're already logged in.

### Step 2: Verify Database Connection

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Participant\";"
```

Expect: At least 1 participant in the database (needed for seed data).

### Step 3: Run QA Test

```bash
# Set environment
export DATABASE_URL="postgresql://user:password@host/chartgen"
export SESSION_COOKIE="<your-session-cookie>"

# Run test script
node scripts/test-blue-team-detector.mjs
```

The script will:
1. Seed synthetic anomalies for each detector
2. Call `/api/qa/detect-anomalies?from=2026-03-01&to=2026-03-07`
3. Verify each detector returns expected anomalies with correct fields

---

## Expected Output

### Success Case (All 3 detectors fire)

```
🧪 Blue Team Anomaly Detector — QA Test Suite

Base URL: http://localhost:3000
Test window: 2026-03-01 to 2026-03-07

📝 PHASE 1: Seeding Synthetic Anomalies

✅ Ghost Shift: SleepSettlingLog with exact 60-min intervals (4 entries)
✅ Unauthorised Restraint (No BSP): RestrictivePracticeEvent with NULL bspVersionId
✅ Unauthorised Restraint (Outside Window): RestrictivePracticeEvent outside BSP active dates
✅ Silent Dehydration (Low Intake): MealLog + BowelFluidLog < 800ml with no escalation note

🔍 PHASE 2: Running Anomaly Detection

✅ Detection completed at 2026-03-07T15:30:45.123Z
   Window: 2026-03-01 to 2026-03-07
   Total anomalies: 4

✓ PHASE 3: Verifying Detector Responses

✅ Ghost Shift: 1 flag(s) detected
   - Severity: CRITICAL
   - Participant: John Doe
   - Staff: Jane Worker
   - Detail: {"runLengthChecks":6,"runStart":"2026-03-02T22:00:00Z","runEnd":"2026-03-03T04:00:00Z","intervalMinutes":60}

✅ Unauthorised Restraint: 2 flag(s) detected
   - Severity: CRITICAL
   - Participant: John Doe
   - Staff: Jane Worker
   - Detail: {"reason":"NO_BSP_ON_RECORD",...}

✅ Silent Dehydration: 1 flag(s) detected
   - Severity: HIGH
   - Participant: John Doe
   - Staff: No escalation recorded
   - Detail: {"day":"2026-03-04","totalMl":600,"thresholdMl":800,"deficitMl":200,"escalationLogged":false}

========================================

✅ All detector paths verified: 3/3 PASS
```

### Failure Case (One or more detectors missing)

```
❌ Ghost Shift: Expected ≥1, got 0
✅ Unauthorised Restraint: 2 flag(s) detected
✅ Silent Dehydration: 1 flag(s) detected

========================================

⚠️  Verification incomplete: 2 PASS, 1 FAIL
```

**Common causes:**
- Seed SQL failed (missing participant/staff fixtures)
- Date window doesn't overlap synthetic data
- Detector logic has a bug

---

## Manual Testing (Without Script)

If you want to test individual detectors:

### Ghost Shift Manual Test

1. Create SleepSettlingLog entries with exact 60-minute intervals:

```sql
INSERT INTO "SleepSettlingLog" (id, "participantId", "loggedByStaffId", "checkTime", status, source, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-02 22:00:00', 'ASLEEP', 'SYNTHETIC_QA', NOW(), NOW()),
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-02 23:00:00', 'ASLEEP', 'SYNTHETIC_QA', NOW(), NOW()),
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-03 00:00:00', 'ASLEEP', 'SYNTHETIC_QA', NOW(), NOW()),
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-03 01:00:00', 'ASLEEP', 'SYNTHETIC_QA', NOW(), NOW());
```

2. Call endpoint:

```bash
curl -H "Cookie: gwc_session=$SESSION_COOKIE" \
  "http://localhost:3000/api/qa/detect-anomalies?from=2026-03-02&to=2026-03-03" | jq .
```

3. Expect: `anomalies[0].flagType === "GHOST_SHIFT"` with `runLengthChecks >= 4`

### Unauthorised Restraint Manual Test

```sql
-- Null BSP case
INSERT INTO "RestrictivePracticeEvent" (id, "participantId", "loggedByStaffId", timestamp, type, reason, "bspVersionId", source, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-03 14:30:00', 'PHYSICAL', 'Aggressive behavior', NULL, 'SYNTHETIC_QA', NOW(), NOW());

-- Outside window case
INSERT INTO "BehaviourSupportPlan" (id, "participantId", "activeFrom", "activeTo", version, source, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'participant-id', '2026-03-01 00:00:00', '2026-03-05 23:59:59', 1, 'SYNTHETIC_QA', NOW(), NOW());

INSERT INTO "RestrictivePracticeEvent" (id, "participantId", "loggedByStaffId", timestamp, type, reason, "bspVersionId", source, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-06 10:00:00', 'CHEMICAL', 'Sedation', (SELECT id FROM "BehaviourSupportPlan" WHERE "participantId" = 'participant-id' LIMIT 1), 'SYNTHETIC_QA', NOW(), NOW());
```

3. Expect: 2 anomalies with `flagType === "UNAUTHORISED_RESTRAINT"`

### Silent Dehydration Manual Test

```sql
-- Low intake (< 800ml in a day)
INSERT INTO "MealLog" (id, "participantId", "createdByStaffId", timestamp, "mealType", "foodTexture", "fluidThickness", "volumeMl", "amountEaten", source, "provenanceHash", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-04 08:00:00', 'BREAKFAST', 1, 1, 150, 'TWENTY_FIVE', 'SYNTHETIC_QA', 'hash1', NOW(), NOW()),
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-04 12:00:00', 'LUNCH', 1, 1, 200, 'FIFTY', 'SYNTHETIC_QA', 'hash2', NOW(), NOW()),
  (gen_random_uuid(), 'participant-id', 'staff-id', '2026-03-04 18:00:00', 'DINNER', 1, 1, 250, 'SEVENTY_FIVE', 'SYNTHETIC_QA', 'hash3', NOW(), NOW());

-- No escalation note for that day
```

3. Expect: 1 anomaly with `flagType === "SILENT_DEHYDRATION"`, `totalMl === 600` (< 800)

---

## Troubleshooting

### "Property 'restrictivePracticeEvent' does not exist"
- **Cause:** Schema models not yet generated
- **Fix:** Run `npx prisma generate` after schema changes land

### "Unauthorized" (401)
- **Cause:** Invalid or missing session cookie
- **Fix:** Re-authenticate via `/api/auth/login`

### Test seed SQL fails silently
- **Cause:** Missing participant/staff fixtures
- **Fix:** Create test fixtures: `INSERT INTO "Participant" ... INSERT INTO "Staff" ...`

### Detector returns empty anomalies array
- **Cause:** Seed data doesn't match detector logic or date range is wrong
- **Fix:** Verify seed data exists in DB and date range includes seed dates

### Database connection error
- **Cause:** `DATABASE_URL` not set or database unreachable
- **Fix:** `export DATABASE_URL="postgresql://..."` and verify `psql` can connect

---

## Detector Logic Reference

**Ghost Shift:**
- Looks for SleepSettlingLog with ≥4 consecutive entries at exactly 60-minute intervals
- Reports runLengthChecks (count of entries in run), runStart, runEnd

**Unauthorised Restraint:**
- Flags RestrictivePracticeEvent where bspVersionId is NULL (no BSP on record)
- Flags RestrictivePracticeEvent where event.timestamp is before bsp.activeFrom or after bsp.activeTo
- Reports reason (NO_BSP_ON_RECORD | OUTSIDE_BSP_ACTIVE_WINDOW) and timestamps

**Silent Dehydration:**
- Sums MealLog.volumeMl + BowelFluidLog.volumeMl (FLUID_IN only) per 24-hour UTC day
- Flags days where total < 800ml AND no ShiftNote with category='ESCALATION' exists
- Reports day, totalMl, thresholdMl (800), deficitMl

---

## Next Steps

1. Run `node scripts/test-blue-team-detector.mjs` against live dev server
2. Verify all 3 detectors fire and return expected responses
3. If all PASS: Route is production-ready
4. If any FAIL: Debug detector logic or seed data

---

**Test Created:** 2026-02-28
**Last Updated:** 2026-02-28
