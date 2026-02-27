# Blue Team Anomaly Detector — QA Scripts

Two scripts for validating the detector endpoint and 3/3 detector paths:

## 1. Seed QA Data (Prisma-based)

```bash
node scripts/seed-blue-team-qa.mjs [--clear]
```

**What it does:**
- Creates test participant and staff fixtures (if not exist)
- Seeds synthetic anomalies for all 3 detector types:
  - **Ghost Shift**: 6 SleepSettlingLog entries at exact 60-min intervals
  - **Unauthorised Restraint**: 2 RestrictivePracticeEvent (null BSP + outside window)
  - **Silent Dehydration**: 3 MealLog with 600ml total (< 800ml threshold), no escalation
- Marks all data with `source = "SYNTHETIC_QA"` (test data, not production)

**Requirements:**
- `DATABASE_URL` env var set (e.g., `postgresql://user:pass@host/db`)
- Prisma schema applied (`npx prisma migrate deploy`)
- Node 18+

**Usage:**
```bash
export DATABASE_URL="postgresql://user:pass@localhost/chartgen"
node scripts/seed-blue-team-qa.mjs

# Output:
# ✅ Created participant: QA Test Participant (uuid)
# ✅ Created staff: QA Test Worker (uuid)
# ✅ Created 6 SleepSettlingLog entries (60-min intervals)
# ✅ Created RestrictivePracticeEvent without BSP
# ✅ Created RestrictivePracticeEvent outside BSP window
# ✅ Created 3 MealLog entries on 2026-03-04
# ✅ No escalation ShiftNote created for this day (anomaly trigger)
#
# ✅ QA Data Seeding Complete
```

**Options:**
- `--clear` — Delete old test data before seeding (start fresh)

---

## 2. Validate Detector Endpoint

```bash
node scripts/validate-blue-team-qa.mjs \
  --url http://localhost:3000 \
  --cookie <gwc_session> \
  [--from 2026-03-01] [--to 2026-03-07]
```

**What it does:**
- Calls `GET /api/qa/detect-anomalies` with test date range
- Validates all 3 detector paths return expected anomalies:
  - Ghost Shift (1 CRITICAL flag)
  - Unauthorised Restraint (2 CRITICAL flags)
  - Silent Dehydration (1 HIGH flag)
- Verifies response structure and required detail fields
- Returns PASS/FAIL with evidence

**Requirements:**
- Seed data already created (run script #1 first)
- Dev server running (`npm run dev` on port 3000)
- Valid session cookie from authenticated login
- Node 18+

**Get session cookie:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"<SITE_PASSWORD>"}' | jq .sessionToken
```

**Usage:**
```bash
export SESSION_COOKIE="<your-gwc_session-value>"
node scripts/validate-blue-team-qa.mjs --url http://localhost:3000 --cookie "$SESSION_COOKIE"

# Output:
# 🔍 Blue Team Anomaly Detector — QA Validation
#
# Base URL: http://localhost:3000
# Window: 2026-03-01 to 2026-03-07
# Auth: gwc_session=abc123...
#
# 📡 Calling /api/qa/detect-anomalies...
# ✅ Detector returned 4 anomalies
#
# ✅ Ghost Shift
#    Count: 1/1 required
#    Severity: CRITICAL
#    Participant: QA Test Participant
#    Staff: QA Test Worker
#    Detail: {"runLengthChecks":6,"runStart":"2026-03-02T22:00:00Z",...}
#
# ✅ Unauthorised Restraint
#    Count: 2/2 required
#    Severity: CRITICAL
#    ...
#
# ✅ Silent Dehydration
#    Count: 1/1 required
#    Severity: HIGH
#    ...
#
# ========================================
# ✅ QA VALIDATION PASS: 3/3 detectors triggered
#
# Endpoint is QA-verified and ready for integration.
```

**CLI Options:**
```
--url <url>         Base URL (default: http://localhost:3000)
--cookie <cookie>   Session cookie (required)
--from <date>       Start date (default: 2026-03-01)
--to <date>         End date (default: 2026-03-07)
--help              Show usage
```

**Environment Variables:**
- `BASE_URL` — override `--url`
- `SESSION_COOKIE` — override `--cookie`
- `TEST_FROM` — override `--from`
- `TEST_TO` — override `--to`

---

## Full QA Workflow

### For Environments WITH Database Access

```bash
# 1. Seed test data (Prisma)
export DATABASE_URL="postgresql://user:pass@localhost/chartgen"
node scripts/seed-blue-team-qa.mjs

# 2. Validate detector endpoint
export SESSION_COOKIE="<from-login-endpoint>"
node scripts/validate-blue-team-qa.mjs --url http://localhost:3000 --cookie "$SESSION_COOKIE"

# Expected output:
# ✅ QA VALIDATION PASS: 3/3 detectors triggered
```

### For Environments WITHOUT Direct Database Access

```bash
# 1. Request operator to run seed script on server
#    (They have DATABASE_URL access)
#    node scripts/seed-blue-team-qa.mjs

# 2. Run validation script from anywhere with network access to dev server
export SESSION_COOKIE="<from-login-endpoint>"
node scripts/validate-blue-team-qa.mjs --url http://dev-server:3000 --cookie "$SESSION_COOKIE"
```

---

## Troubleshooting

### Seed Script Errors

**"DATABASE_URL may be invalid or database unreachable"**
- Check: `psql "$DATABASE_URL" -c "SELECT 1;"`
- Fix: `export DATABASE_URL='postgresql://user:pass@host:5432/dbname'`

**"Relation does not exist"**
- Cause: Prisma schema not applied
- Fix: `npx prisma migrate deploy`

**"Unique constraint violation"**
- Cause: Test data already seeded
- Fix: Run with `--clear` flag: `node scripts/seed-blue-team-qa.mjs --clear`

### Validation Script Errors

**"HTTP 401: Unauthorized"**
- Cause: Invalid or expired session cookie
- Fix: Get new cookie from `/api/auth/login`

**"Route not found (404)"**
- Cause: Dev server not running or route not compiled
- Fix: `npm run dev` and `npm run build`

**"Expected ≥1, got 0"**
- Cause: Seed data doesn't exist or date range is wrong
- Fix: Run seed script first: `node scripts/seed-blue-team-qa.mjs`

---

## Integration into CI/CD

Both scripts exit with status codes suitable for CI/CD:

```bash
# Seed (exit 0 = success, 1 = failure)
node scripts/seed-blue-team-qa.mjs || exit 1

# Validate (exit 0 = PASS, 1 = FAIL)
node scripts/validate-blue-team-qa.mjs --url "$BASE_URL" --cookie "$COOKIE" || exit 1

echo "✅ QA suite passed"
```

---

## Notes

- **Source tagging**: All seed data is marked `source = "SYNTHETIC_QA"` so it won't affect production metrics
- **Idempotency**: Seed script creates fixtures only if they don't exist (safe to run multiple times)
- **Portability**: Scripts use Prisma (no `psql` required) for better cross-platform compatibility
- **No side effects**: Validation script is read-only (only GETs, no data modification)

---

**Scripts created:** 2026-02-28
**QA readiness:** Blocked on database access for evidence collection
