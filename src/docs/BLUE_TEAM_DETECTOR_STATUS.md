# Blue Team Anomaly Detector - Status

## Status

Implemented and live at `GET /api/qa/detect-anomalies`.

- Route file: `src/app/api/qa/detect-anomalies/route.ts`
- Auth: full session required (`gwc_session` or legacy `session` fallback)
- Current output key: `data.breaches` (not `anomalies`)

## Active Detector Set (Current Runtime Truth)

1. `GHOST_SHIFT` (`CRITICAL`)
- Detects 4+ consecutive `SleepSettlingLog` entries at exact ~60-minute intervals.
- Response detail fields include: `runLength`, `intervalMinutes`, `runStart`, `runEnd`, `hoursSpanned`.

2. `CONSTIPATION_GAP` (`HIGH`)
- Detects bowel-recording gaps over 72 hours from `BowelFluidLog.timestamp`.
- Gap modes: `NO_BOWEL_LOGS`, `EXTENDED_GAP`, `TRAILING_GAP`.

3. `UNAUTHORISED_RESTRAINT` (`CRITICAL`)
- Detects `RestrictivePracticeEvent` records with `bspVersionId = null`.
- Detail field `reason` currently uses `NO_BEHAVIOUR_SUPPORT_PLAN`.

## Response Shape

```json
{
  "ok": true,
  "data": {
    "window": { "from": "2026-03-01", "to": "2026-03-07" },
    "breaches": [
      {
        "breachType": "GHOST_SHIFT",
        "severity": "CRITICAL",
        "participantId": "uuid",
        "participantName": "Name",
        "detail": {},
        "detectedAt": "2026-03-07T15:30:45.123Z"
      }
    ],
    "summary": {
      "total": 1,
      "byType": {
        "GHOST_SHIFT": 1,
        "CONSTIPATION_GAP": 0,
        "UNAUTHORISED_RESTRAINT": 0
      }
    },
    "detectedAt": "2026-03-07T15:30:45.123Z"
  }
}
```

## Notes

- Historical documentation references to `SILENT_DEHYDRATION`, `flagType`, `anomalies[]`, and `ranAt` are stale for current runtime.
- Historical references to out-of-window BSP checks are also stale for current runtime route logic.
- Keep this file aligned with `src/app/api/qa/detect-anomalies/route.ts` as source of truth.
