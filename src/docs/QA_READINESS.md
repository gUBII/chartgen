# Blue Team Anomaly Detector - QA Readiness

Date: 2026-02-28
Status: Ready for manual QA against current runtime contract.

## Route Under Test

- Endpoint: `GET /api/qa/detect-anomalies?from=YYYY-MM-DD&to=YYYY-MM-DD`
- File: `src/app/api/qa/detect-anomalies/route.ts`
- Auth: full session required

## Runtime Contract (Current)

- Top-level success key: `ok: true`
- Data key for findings: `data.breaches`
- Breach type enum:
  - `GHOST_SHIFT`
  - `CONSTIPATION_GAP`
  - `UNAUTHORISED_RESTRAINT`
- Timestamp key: `data.detectedAt`

## Detector Expectations

1. Ghost Shift (`CRITICAL`)
- Expect 4+ exact 60-minute sleep-check runs.

2. Constipation Gap (`HIGH`)
- Expect 72h bowel-record gaps with `gapType` in:
  - `NO_BOWEL_LOGS`
  - `EXTENDED_GAP`
  - `TRAILING_GAP`

3. Unauthorised Restraint (`CRITICAL`)
- Expect records where `bspVersionId` is null.
- Expect detail reason `NO_BEHAVIOUR_SUPPORT_PLAN`.

## QA Checklist

- [ ] Missing `from`/`to` returns HTTP 400.
- [ ] Invalid dates return HTTP 400.
- [ ] Missing/guest session returns HTTP 401.
- [ ] Valid full session returns HTTP 200 with `data.breaches`.
- [ ] `summary.total` equals `breaches.length`.
- [ ] `summary.byType` counts match breach distribution.

## Important Note

The script `scripts/test-blue-team-detector.mjs` currently follows an older response contract (`anomalies`, `flagType`, `ranAt`, `SILENT_DEHYDRATION`). Use manual API QA for authoritative verification until that script is updated.
