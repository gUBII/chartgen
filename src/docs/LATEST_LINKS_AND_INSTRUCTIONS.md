# Latest Links and Instructions

**Last Updated:** 2026-02-27  
**Version:** 3.4.0

## Production Links

- **App:** https://chartgen-gubii.netlify.app
- **Deploy Preview:** https://main--chartgen-gubii.netlify.app
- **Netlify Admin:** https://app.netlify.com/projects/chartgen-gubii
- **GitHub:** https://github.com/gUBII/chartgen

---

## v3.4 New Routes & Features

### Audit Engine (KPI + AI Gap-Report)
- **Page:** `/audit-engine` (protected, full-access only)
- **API POST:** `/api/audit/gap-report` (generate report with date range)
- **API GET:** `/api/audit/gap-report/{id}` (retrieve saved report)
- **Report Display:** `/audit-reports/{id}` (view KPI + AI summary + recommendations)

### Audit Explorer (Data Browser)
- **Page:** `/audit-explorer` (protected, full-access only)
- **API:** `/api/audit/explorer` (table data endpoint)
- **Features:** Entity filter (meal/mar/audit/batch), search, pagination

### Environment Variables (v3.4)

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
- `GET /api/engine/commit` - View commit history
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
4. **Audit Trail:** JSON saved to `/tmp/chartgen-ai-reports/{id}.json`

---

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 on /api/audit/* | Missing full session | Login with full credentials |
| Gap report empty | Gemini not configured | Set `GEMINI_API_KEY` env var |
| Generator seed not deterministic | State leak between requests | Ensure identical seed + profile |
| /audit-explorer shows no data | Wrong filter | Try "audit" scope or clear search |

---

## Next Steps (v3.5)

- [ ] Persistent gap report storage (move from `/tmp` to database)
- [ ] Report scheduling (automated daily/weekly)
- [ ] Custom alert rules on KPI thresholds
- [ ] Integration with external audit systems
