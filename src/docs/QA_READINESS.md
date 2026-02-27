# Blue Team Anomaly Detector — QA Readiness Report

**Date:** 2026-02-28
**Status:** ✅ READY FOR LIVE QA TESTING
**Build:** ✅ PASSING (commit 7224703c)
**Route:** ✅ LIVE (`/api/qa/detect-anomalies`)

---

## Deliverables

### 1. Implementation ✅
- **Route:** `src/app/api/qa/detect-anomalies/route.ts` (300 lines)
- **Auth:** `requireFullSession` (Variant A) — full role required
- **Detectors:** 3 parallel async functions with error handling
- **Compilation:** TypeScript passes, all dependencies resolved

### 2. Detectors ✅

#### Ghost Shift (CRITICAL)
- **SQL Query:** LAG window function + run grouping
- **Logic:** Detects 4+ consecutive SleepSettlingLog entries at exactly 60-minute intervals
- **Signature:** Worker falsification (copy-pasted check times)
- **Response:** `runLengthChecks`, `runStart`, `runEnd`, `intervalMinutes`

#### Unauthorised Restraint (CRITICAL)
- **Query Type:** Two-pass Prisma fluent (null check + range check)
- **Logic:** Flags RestrictivePracticeEvent where:
  - `bspVersionId = NULL` (no BSP on record), OR
  - Event timestamp is outside BSP's activeFrom/activeTo window
- **Response:** `reason` (NO_BSP_ON_RECORD | OUTSIDE_BSP_ACTIVE_WINDOW), timestamps

#### Silent Dehydration (HIGH)
- **SQL Query:** FULL OUTER JOIN meal/bowel fluids + LEFT JOIN escalation absence
- **Logic:** Flags days where:
  - `MealLog.volumeMl + BowelFluidLog.volumeMl < 800ml`, AND
  - No ShiftNote with `category = 'ESCALATION'` exists for that day
- **Response:** `day`, `totalMl`, `thresholdMl` (800), `deficitMl`

### 3. Documentation ✅
- `CODEX_SCHEMA_ADDITIONS_BLUE_TEAM.md` — Schema specifications
- `BLUE_TEAM_DETECTOR_USAGE.md` — API documentation + examples
- `BLUE_TEAM_DETECTOR_STATUS.md` — Handoff summary
- `BLUE_TEAM_QA_TESTING.md` — QA testing guide + troubleshooting
- `QA_READINESS.md` — This document

### 4. QA Test Suite ✅
- **File:** `scripts/test-blue-team-detector.mjs`
- **Capabilities:**
  - Seeds synthetic anomalies for all 3 detectors
  - Calls detector endpoint with configurable date range
  - Verifies response structure and required fields
  - Provides PASS/FAIL exit codes for CI/CD integration
- **Usage:** `node scripts/test-blue-team-detector.mjs`

---

## Database State

**Schema Models:** ✅ All 5 models present in active schema
- `SleepSettlingLog` (Ghost Shift)
- `BehaviourSupportPlan` (Restraint)
- `RestrictivePracticeEvent` (Restraint)
- `BowelFluidLog` (Dehydration)
- `ShiftNote` (Dehydration)

**Enums:** ✅ All 3 enums present
- `BowelFluidType` (BOWEL, FLUID_IN, FLUID_OUT)
- `ShiftNoteCategory` (ROUTINE, ESCALATION, INCIDENT_FOLLOWUP, CLINICAL_HANDOVER)
- `RestrictivePracticeType` (CHEMICAL, PHYSICAL, MECHANICAL, ENVIRONMENTAL)

**Source Tagging:** ✅ `SYNTHETIC_QA` source value available
- Used to tag synthetic test data
- Allows filtering real vs. test data in queries

**Migrations:** ✅ Applied (Codex)
- `npx prisma validate` ✅
- `npx prisma generate` ✅

---

## Endpoint Specification

**URL:** `GET /api/qa/detect-anomalies`
**Auth:** Cookie with `gwc_session` and `role="full"`
**Query Params:** `from` (ISO date), `to` (ISO date)

**Success Response (200):**
```json
{
  "ok": true,
  "data": {
    "window": { "from": "2026-03-01", "to": "2026-03-07" },
    "anomalies": [
      {
        "flagType": "GHOST_SHIFT|UNAUTHORISED_RESTRAINT|SILENT_DEHYDRATION",
        "severity": "CRITICAL|HIGH",
        "participantId": "uuid",
        "participantName": "Full Name",
        "staffId": "uuid",
        "staffName": "Staff Name",
        "detail": { /* flag-specific fields */ }
      }
    ],
    "summary": {
      "total": 4,
      "byType": { "GHOST_SHIFT": 1, "UNAUTHORISED_RESTRAINT": 2, "SILENT_DEHYDRATION": 1 }
    },
    "ranAt": "2026-02-28T15:30:45.123Z"
  }
}
```

**Error Responses:**
- 400: Missing/invalid params
- 401: Unauthorized (guest role or no session)
- 500: Server error (detector exceptions logged)

---

## QA Test Procedure

### Prerequisites
1. Chartgen schema applied (`npx prisma migrate deploy`)
2. Test participants/staff fixtures exist
3. Dev server running (`npm run dev`)
4. Valid session cookie from `/api/auth/login`

### Run Tests
```bash
export DATABASE_URL="postgresql://..."
export SESSION_COOKIE="<your-session-cookie>"

node scripts/test-blue-team-detector.mjs
```

### Expected Output
```
✅ All detector paths verified: 3/3 PASS
```

### Test Verification Checklist
- [ ] Ghost Shift: 1+ CRITICAL flags returned with runLengthChecks ≥ 4
- [ ] Unauthorised Restraint: 2+ CRITICAL flags returned with reason field
- [ ] Silent Dehydration: 1+ HIGH flags returned with totalMl < 800
- [ ] Response contains participant names and staff attribution
- [ ] Summary totals match anomalies array length
- [ ] ranAt timestamp is recent (within test execution time)

---

## Build Status

```
npm run build: ✅ PASS (1119ms)
- Compiled successfully
- 27 static pages generated
- Route /api/qa/detect-anomalies included
- TypeScript: 0 errors
- No new blocking issues

npm run lint:report: ✅ PASS (13 pre-existing warnings, 0 new errors)
- New detector code has no lint violations
```

---

## Route Lifecycle

1. ✅ **Design & Implementation** (Commit af40db4d)
   - Plan created and approved
   - Route fully implemented with 3 detectors
   - Error handling and auth integrated

2. ✅ **Schema Integration** (Codex)
   - All 5 models added to active schema
   - All 3 enums defined
   - Migrations applied

3. ✅ **Compilation & Build** (Commit af40db4d + 7224703c)
   - TypeScript passes
   - Next.js build succeeds
   - Route is live and callable

4. ⏳ **Live QA Testing** (NOW)
   - Run `node scripts/test-blue-team-detector.mjs`
   - Verify all 3 detector paths fire correctly
   - Validate response structures

5. ⏳ **Production Readiness** (POST-QA)
   - If all tests PASS → route is production-ready
   - If any tests FAIL → debug and re-test

---

## Known Limitations & Notes

1. **Query Performance**
   - Date window should be ≤ 90 days for reasonable latency
   - Large participant sets (10k+) may require query optimization

2. **Detector Sensitivity**
   - Ghost Shift: 4-entry minimum (configurable)
   - Dehydration: 800ml threshold (configurable)
   - Thresholds can be tweaked without code changes (edit SQL in route)

3. **Synthetic Data**
   - Test uses `source = 'SYNTHETIC_QA'` to avoid affecting real data
   - Production queries can filter by source if needed

4. **Error Handling**
   - Individual detector failures are logged but don't block other detectors
   - If DB is down, all detectors return empty arrays (graceful degradation)

---

## Support & Escalation

**Build issues?** → Check `npm run build` output
**Route not responding?** → Verify dev server is running on port 3000
**Test failures?** → See troubleshooting in `BLUE_TEAM_QA_TESTING.md`
**Schema missing?** → Confirm `npx prisma generate` was run
**Auth errors?** → Verify session cookie via `GET /api/auth/check`

---

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 7224703c | Add Blue Team QA test suite | +2 files |
| af40db4d | Implement PHASE 4 Blue Team Detector | +8 files |
| 4bc21d6b | v3.5 Database-backed gap reports | +8 files |

---

## Success Criteria (QA Pass/Fail)

✅ **PASS** if:
- Ghost Shift test returns CRITICAL flag with runLengthChecks ≥ 4
- Unauthorised Restraint test returns 2+ CRITICAL flags with correct reasons
- Silent Dehydration test returns HIGH flag with totalMl < 800
- All responses include participant names and staff attribution
- Endpoint returns 401 for unauthenticated requests
- Endpoint returns 400 for invalid date params

❌ **FAIL** if:
- Any detector returns 0 anomalies when seed data exists
- Response fields are missing or malformed
- Build fails or lint errors appear
- Auth protection is bypassed

---

**Status:** Ready for live QA testing.
**Next Step:** Run `node scripts/test-blue-team-detector.mjs` against dev server.
