# Blue Team Anomaly Detector - API Usage

## Endpoint

`GET /api/qa/detect-anomalies?from=YYYY-MM-DD&to=YYYY-MM-DD`

## Authentication

Requires full session cookie (`gwc_session` or legacy `session` fallback).

## Query Params

- `from` (required): `YYYY-MM-DD`
- `to` (required): `YYYY-MM-DD`

## Success Response (200)

```json
{
  "ok": true,
  "data": {
    "window": { "from": "2026-02-01", "to": "2026-02-28" },
    "breaches": [
      {
        "breachType": "GHOST_SHIFT",
        "severity": "CRITICAL",
        "participantId": "uuid-1234",
        "participantName": "John Doe",
        "detail": {
          "runLength": 6,
          "intervalMinutes": 60,
          "runStart": "2026-02-27T22:00:00.000Z",
          "runEnd": "2026-02-28T03:00:00.000Z",
          "hoursSpanned": 5
        },
        "detectedAt": "2026-02-28T15:30:45.123Z"
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
    "detectedAt": "2026-02-28T15:30:45.123Z"
  }
}
```

## Error Responses

- `400`: missing or invalid `from`/`to`
- `401`: unauthorized
- `500`: internal error

## Breach Types

1. `GHOST_SHIFT` (`CRITICAL`)
- Sleep checks at exact ~60-minute spacing for 4+ consecutive entries.

2. `CONSTIPATION_GAP` (`HIGH`)
- 72-hour bowel-recording gaps.
- `detail.gapType`: `NO_BOWEL_LOGS`, `EXTENDED_GAP`, `TRAILING_GAP`.

3. `UNAUTHORISED_RESTRAINT` (`CRITICAL`)
- Restrictive practice event with `bspVersionId = null`.
- `detail.reason`: `NO_BEHAVIOUR_SUPPORT_PLAN`.

## cURL Example

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"full","password":"<site_password>"}' \
  -c /tmp/cookies.txt

curl -b /tmp/cookies.txt \
  "http://localhost:3000/api/qa/detect-anomalies?from=2026-02-01&to=2026-02-28" | jq .
```

## Notes

- Current contract uses `breaches`, not `anomalies`.
- Current contract uses `breachType`, not `flagType`.
- Current contract uses `detectedAt`, not `ranAt`.
