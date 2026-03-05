# Latest Links and Instructions

**Last Updated:** 2026-03-05
**Version:** 3.9.0
**Timeline Window:** October 2025 -> March 2026 (staged release ledger)

## Production Links

- **App:** https://chartgen-gubii.netlify.app
- **Deploy Preview:** https://main--chartgen-gubii.netlify.app
- **Netlify Admin:** https://app.netlify.com/projects/chartgen-gubii
- **GitHub:** https://github.com/gUBII/chartgen

---

## Phase E: Grouped Commit & Restoration Refactor

### Grouped Commit Payload (`POST /api/engine/commit`)

Single endpoint now handles 8 log types transactionally:

```json
{
  "marLogs": [...],
  "mealLogs": [...],
  "sleepLogs": [...],
  "bglLogs": [...],
  "bowelLogs": [...],
  "hygieneLogs": [...],
  "communityLogs": [...],
  "repositionLogs": [...]
}
```

**Validation Hardening:**
- Unknown `source` values rejected with 422 INVALID_SOURCE
- Unknown `dataSource` values rejected with 422 INVALID_SOURCE
- Ambiguous bowel type (zero intake + zero output) rejected with 422 AMBIGUOUS_BOWEL_TYPE
- All 8 models validated upfront; missing models return 500 SCHEMA_NOT_READY

### Restoration Dashboard Enhancements

- **Tabbed UI:** Medication | Nutrition & Bowel | Night Routine | Health & Vitals
- **Defect Highlighting:** Rows with `qaAnomalyFlag=true` or `qaMeta.defect` shown with amber background
- **Smart Classification:** `splitMixedEntries()` classifies mixed log entries by explicit `kind` field, then characteristic fields
- **Module Coverage:** restoration preview now includes `mealLogs`, `marLogs`, `sleepLogs`, `bglLogs`, `bowelLogs`, `hygieneLogs`, `communityLogs`, and `repositionLogs`
- **Scale Upgrade:** supports 365-day preview ranges and larger batch commit volumes
- **Operations Upgrade:** includes Discard Batch state reset and env-gated global nuke controls for UAT
- **Injector Upgrade:** supports URL-pointer prefill and DB-backed injector button configuration

### MAR Workflow Enhancements (v3.9)

- Tabbed MAR page flow with dropdown-driven medication setup
- XLSX export support from MAR page
- MAR template API and seed support:
  - `GET/POST /api/admin/mar-templates`
  - `node scripts/seed-mar-templates.mjs`

---

## Audit Routes & Features (active in v3.9, introduced in v3.4+)

### Audit Engine (KPI + AI Gap-Report)
- **Page:** `/audit-engine` (protected, full-access only)
- **API POST:** `/api/audit/gap-report` (generate report with date range)
- **API GET:** `/api/audit/gap-report/{id}` (retrieve saved report)
- **Report Display:** `/audit-reports/{id}` (view KPI + AI summary + recommendations)

### Audit Explorer (Data Browser)
- **Page:** `/audit-explorer` (protected, full-access only)
- **API:** `/api/audit/explorer` (table data endpoint)
- **Features:** Entity filter (meal/mar/audit/batch), search, pagination

### Environment Variables

```bash
# Required
SESSION_SECRET=<long-random-string-64-chars>
GEMINI_API_KEY=<google-ai-api-key>

# Optional (defaults shown)
SESSION_TTL_SEC=604800  # 7 days in seconds
GEMINI_MODEL=gemini-2.0-flash
```

### Generator Enhancements (Backward Compatible)

**Optional fields in POST /api/engine/preview:**
```json
{
  "participantId": "P123",
  "startDate": "2026-02-27",
  "endDate": "2026-02-27",
  "seed": 42,
  "profile": "balanced"
}
```

**Optional fields in POST /api/engine/mar-preview:**
```json
{
  "participantId": "P123",
  "startDate": "2026-02-27",
  "endDate": "2026-02-27",
  "seed": 42,
  "profile": "balanced"
}
```

**Profiles:** `balanced` (default), `strict`

---

## Authentication & Session

### Cookie Parity
- Primary: `gwc_session` (new, HMAC-signed)
- Fallback: `session` (legacy, for backward compatibility)

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "role": "full",
  "username": "alice",
  "password": "<password>"
}
```

### Logout
```bash
POST /api/auth/logout
```

Clears both `gwc_session` and legacy `session` cookies.

---

## Protected Endpoints (Full-Access Only)

- `POST /api/audit/gap-report` - Generate AI gap report
- `GET /api/audit/gap-report/{id}` - Retrieve report
- `GET /api/audit/explorer` - Browse audit data
- `GET /api/audit/kpi` - KPI metrics endpoint
- `GET /api/ops/db-health` - Database health check
- `POST /api/ops/uat` - UAT stress/cleanup runner
- `GET /api/qa/detect-anomalies` - Blue Team anomaly detector
- All PATCH/POST engine routes except preview/export

---

## Local Development

### Environment Setup
```bash
cp .env.example .env.local
# Edit with SESSION_SECRET + GEMINI_API_KEY
```

### Run Commands
```bash
npm run dev                    # Start dev server
npm run build                 # Build production
npm run lint:report          # Check code (non-blocking)
npm run lint:strict          # Check code (fail-on-warning)
npm run db:health            # Check database
npm run db:health:trend      # Monitor DB trends
```

---

## Deployment Notes

**Netlify Settings Required:**
1. `SESSION_SECRET` (unique per environment, 32+ chars)
2. `GEMINI_API_KEY` (from Google AI Studio)
3. `SESSION_TTL_SEC` (optional, default 604800)
4. `GEMINI_MODEL` (optional, default gemini-2.0-flash)

**Post-Deploy Verification:**
```bash
# Check commit ref
curl https://chartgen-gubii.netlify.app/api/ops/db-health \
  -H "Cookie: gwc_session=<token>"

# Should return: status, pooled target, direct target
```

---

## Gap Report Workflow (v3.4)

1. **Generate:** `/audit-engine` → Select dates → "Generate AI Gap Report"
2. **Retrieve:** Report ID shown → Click "View AI Report"
3. **Display:** `/audit-reports/{id}` shows:
   - KPI Metrics (completion rate, error rate, processing time)
   - AI Summary (from Gemini Flash)
   - Recommendations (generated)
4. **Audit Trail:** report is persisted in PostgreSQL (`GapReport`) and fetched via `GET /api/audit/gap-report/[id]`

---

## API Testing with Cookies

When testing protected endpoints via curl/Postman, ensure cookie format is correct:

```bash
# ✅ CORRECT: token only (gwc_session= prefix handled by browser/client)
curl https://chartgen-gubii.netlify.app/api/auth/check \
  -H "Cookie: gwc_session=<your-token-here>"

# ❌ WRONG: do NOT double-prefix
curl https://chartgen-gubii.netlify.app/api/auth/check \
  -H "Cookie: gwc_session=gwc_session=<your-token>"

# ✅ Multiple cookies
curl https://chartgen-gubii.netlify.app/api/auth/check \
  -H "Cookie: gwc_session=<token>; other=value"
```

Response codes:
- **200:** Authenticated successfully
- **307:** Redirect to /login (missing/invalid session)
- **401:** Session exists but full-access check failed

---

## Production Seeding (UAT Setup)

Create `.env.production.local` with production database URLs:

```bash
cat > .env.production.local << 'EOF'
DATABASE_URL="postgresql://user:password@endpoint-pooler.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@endpoint.region.aws.neon.tech/dbname?sslmode=require"
EOF
```

Run seeds against production:

```bash
set -a; source .env.production.local; set +a
node scripts/seed-uat-staff.mjs
node scripts/seed-uat-participant.mjs
```

This creates:
- **Staff:** UAT Support Worker, UAT Supervisor, UAT Clinical Lead (for commits)
- **Participants:** UAT Test Participant 1, UAT Test Participant 2

**⚠️ IMPORTANT:** Do NOT commit `.env.production.local` to version control.

---

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 on /api/audit/* | Missing full session | Login with full credentials |
| Gap report empty | Gemini not configured | Set `GEMINI_API_KEY` env var |
| Generator seed not deterministic | State leak between requests | Ensure identical seed + profile |
| /audit-explorer shows no data | Wrong filter | Try "audit" scope or clear search |

---

## Canonical Handshake Channels

- **Claude:** `/Users/moofasa/chartgen/handoff/claude_handshake.log`
- **Gemini:** `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

---

## Next Steps (v3.9)

- [ ] Add integration tests for admin CRUD and unified preview API parity.
- [ ] Add role-scoped audit dashboards (read-only vs full edit workflows).
- [ ] Add report scheduling with retention policy enforcement.
- [ ] Add KPI-driven alerting thresholds and notification hooks.
