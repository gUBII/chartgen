# Blue Team Anomaly Detector - QA Testing Guide

## Scope

Validate current runtime behavior for `GET /api/qa/detect-anomalies`.

Current detector set:
- `GHOST_SHIFT`
- `CONSTIPATION_GAP`
- `UNAUTHORISED_RESTRAINT`

## Prerequisites

1. Dev server running on `http://localhost:3000`
2. Full-access login credentials
3. Database reachable via configured `DATABASE_URL`

## Step 1: Login and Capture Cookie

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"full","password":"<SITE_PASSWORD>"}' \
  -c /tmp/cookies.txt
```

## Step 2: Run Detector

```bash
curl -b /tmp/cookies.txt \
  "http://localhost:3000/api/qa/detect-anomalies?from=2026-03-01&to=2026-03-07" | jq .
```

## Expected Success Shape

```json
{
  "ok": true,
  "data": {
    "window": { "from": "2026-03-01", "to": "2026-03-07" },
    "breaches": [],
    "summary": {
      "total": 0,
      "byType": {
        "GHOST_SHIFT": 0,
        "CONSTIPATION_GAP": 0,
        "UNAUTHORISED_RESTRAINT": 0
      }
    },
    "detectedAt": "2026-03-07T15:30:45.123Z"
  }
}
```

## Manual Assertion Checklist

- [ ] `data.breaches` exists and is an array.
- [ ] Each breach has `breachType`, `severity`, `participantId`, `participantName`, `detail`, `detectedAt`.
- [ ] No references to `anomalies`, `flagType`, or `ranAt` in returned payload.
- [ ] `UNAUTHORISED_RESTRAINT` detail `reason` equals `NO_BEHAVIOUR_SUPPORT_PLAN`.
- [ ] `CONSTIPATION_GAP` detail includes `gapType`.

## Error Case Checks

Missing params:
```bash
curl -b /tmp/cookies.txt "http://localhost:3000/api/qa/detect-anomalies" | jq .
```

Unauthorized:
```bash
curl "http://localhost:3000/api/qa/detect-anomalies?from=2026-03-01&to=2026-03-07" | jq .
```

## Note

`scripts/test-blue-team-detector.mjs` currently targets an older payload contract and should be treated as legacy until updated.
