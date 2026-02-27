# Blue Team Anomaly Detector — API Documentation

## Endpoint

```
GET /api/qa/detect-anomalies?from=YYYY-MM-DD&to=YYYY-MM-DD
```

## Authentication

Requires `gwc_session` or legacy `session` cookie with `role="full"`. Guest sessions are rejected.

## Query Parameters

| Param | Required | Format | Description |
|-------|----------|--------|-------------|
| `from` | Yes | ISO date (YYYY-MM-DD) | Start of detection window |
| `to` | Yes | ISO date (YYYY-MM-DD) | End of detection window |

## Response Format

### Success (200)

```json
{
  "ok": true,
  "data": {
    "window": { "from": "2026-02-01", "to": "2026-02-28" },
    "anomalies": [ /* AnomalyFlag[] */ ],
    "summary": {
      "total": 5,
      "byType": {
        "GHOST_SHIFT": 1,
        "UNAUTHORISED_RESTRAINT": 2,
        "SILENT_DEHYDRATION": 2
      }
    },
    "ranAt": "2026-02-28T15:30:45.123Z"
  }
}
```

### AnomalyFlag Object

```json
{
  "flagType": "GHOST_SHIFT",
  "severity": "CRITICAL",
  "participantId": "uuid-1234",
  "participantName": "John Doe",
  "staffId": "uuid-5678",
  "staffName": "Jane Worker",
  "detail": { /* flag-specific fields */ }
}
```

### Error Responses

**Missing params (400):**
```json
{ "ok": false, "error": "Missing required params: from, to" }
```

**Invalid date format (400):**
```json
{ "ok": false, "error": "Invalid date format (use ISO format)" }
```

**Unauthorized (401):**
```json
{ "ok": false, "error": "Unauthorized" }
```

**Server error (500):**
```json
{ "ok": false, "error": "Internal server error" }
```

---

## Anomaly Types

### 1. GHOST_SHIFT — Severity: CRITICAL

**Signature:** Sleep settling logs with exactly 60-minute intervals (zero variance) for 4+ consecutive entries.

**What it means:** Workers falsified sleep logs by copy-pasting the same check time repeatedly.

**Example `detail` object:**
```json
{
  "runLengthChecks": 6,
  "runStart": "2026-02-27T22:00:00Z",
  "runEnd": "2026-02-28T04:00:00Z",
  "intervalMinutes": 60,
  "signature": "EXACT_60MIN_INTERVALS"
}
```

### 2. UNAUTHORISED_RESTRAINT — Severity: CRITICAL

**Signature:** Restraint practice event where:
- No Behaviour Support Plan (BSP) is on record (bspVersionId = NULL), OR
- Event timestamp falls outside the BSP's activeFrom/activeTo window

**What it means:** Restraint was applied without authorization or outside the approved window.

**Example `detail` object (null BSP case):**
```json
{
  "reason": "NO_BSP_ON_RECORD",
  "bspVersionId": null,
  "eventTimestamp": "2026-02-27T14:30:00Z",
  "practiceType": "PHYSICAL",
  "durationMin": 15
}
```

**Example `detail` object (outside window):**
```json
{
  "reason": "OUTSIDE_BSP_ACTIVE_WINDOW",
  "bspVersionId": "uuid-bsp",
  "bspActiveFrom": "2026-02-01T00:00:00Z",
  "bspActiveTo": "2026-02-15T23:59:59Z",
  "eventTimestamp": "2026-02-20T10:00:00Z",
  "practiceType": "CHEMICAL"
}
```

### 3. SILENT_DEHYDRATION — Severity: HIGH

**Signature:** 24-hour period where:
- Cumulative fluid intake (MealLog + BowelFluidLog FLUID_IN) < 800ml, AND
- No ShiftNote with category='ESCALATION' logged that day

**What it means:** Participant had dangerously low fluid intake and no staff member escalated or documented concern.

**Example `detail` object:**
```json
{
  "day": "2026-02-27",
  "totalMl": 420,
  "thresholdMl": 800,
  "deficitMl": 380,
  "escalationLogged": false
}
```

---

## Usage Examples

### cURL

```bash
# Authenticate first (requires login)
COOKIE=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"<site_password>"}' \
  -c /tmp/cookies.txt \
  | jq -r '.sessionToken')

# Run detection
curl -b /tmp/cookies.txt \
  "http://localhost:3000/api/qa/detect-anomalies?from=2026-02-01&to=2026-02-28" \
  | jq .
```

### JavaScript / Fetch

```javascript
// Assuming authenticated session exists
const response = await fetch(
  '/api/qa/detect-anomalies?from=2026-02-01&to=2026-02-28',
  { credentials: 'include' }
);

const { ok, data, error } = await response.json();

if (ok) {
  console.log(`Found ${data.summary.total} anomalies`);
  data.anomalies.forEach(flag => {
    console.log(`[${flag.severity}] ${flag.flagType}: ${flag.participantName}`);
  });
} else {
  console.error(`Anomaly detection failed: ${error}`);
}
```

### React Component

```tsx
function AnomalyReporter({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const detectAnomalies = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/qa/detect-anomalies?from=${startDate}&to=${endDate}`,
        { credentials: 'include' }
      );
      const { ok, data, error } = await response.json();
      if (ok) {
        setFlags(data.anomalies);
      } else {
        setError(error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={detectAnomalies} disabled={loading}>
        {loading ? 'Detecting...' : 'Run Anomaly Detection'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {flags.map((flag) => (
        <div key={`${flag.participantId}-${flag.flagType}`}>
          <h4>{flag.participantName}</h4>
          <p>{flag.flagType} [{flag.severity}]</p>
          <pre>{JSON.stringify(flag.detail, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

---

## Performance Notes

- Query window should be ≤ 90 days for reasonable performance (queries raw SQL with CTEs)
- All three detectors run in parallel via `Promise.all()`
- Individual detector timeouts: ~5 seconds each (adjust in route if needed)
- Results are sorted by severity (CRITICAL first)

---

## Integration with Stochastic QA Engine

When `stochasticEngine.ts` generates synthetic care data with:
- `source: "SYNTHETIC_QA"`
- Realistic compliance breach patterns (ghost shifts, unauthorised restraints, silent dehydration)

...this detector will surface them, allowing the system to:
1. Validate the synthetic data is correctly engineered
2. Test compliance alert pipelines
3. Train detection models
4. Calibrate NDIS breach sensitivity

---

## Next Steps

1. Ensure schema models land (see `CODEX_SCHEMA_ADDITIONS_BLUE_TEAM.md`)
2. Seed test data (synthetic or real) via `stochasticEngine.ts`
3. Call GET `/api/qa/detect-anomalies` with appropriate date range
4. Inspect `anomalies[]` array for detected breaches
5. Escalate flags to compliance review workflow
