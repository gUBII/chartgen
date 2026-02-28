# PL-03 Smoke Matrix

**Commit baseline**: `49d0cb06`
**Verified**: 2026-03-01
**Verifier**: Claude (Implementation Architect)

---

## Route Checks

| Route | Method | Expected | Actual | Status |
|---|---|---|---|---|
| `/entry` | GET | 200 | 200 | PASS |
| `/restoration` | GET | 200 | 200 | PASS |
| `/audit-engine` | GET | 200 | 200 | PASS |
| `/audit-explorer` | GET | 200 | 200 | PASS |
| `/chartgen-core` | GET | 200 | 200 | PASS (technical route, not user-navigable) |

## API Checks (unauthenticated)

| Endpoint | Method | Expected | Actual | Status |
|---|---|---|---|---|
| `/api/audit/kpi` | GET | 401 | 401 | PASS |
| `/api/audit/gap-report` | GET | 401 | 401 | PASS |
| `/api/engine/preview` | GET | 405 | 405 | PASS |
| `/api/admin/participants` | GET | 401 | 401 | PASS |
| `/api/admin/staff` | GET | 401 | 401 | PASS |

## Behavior Assumptions (commit 49d0cb06)

| Assumption | Verified | Notes |
|---|---|---|
| `/entry` renders participant + staff dropdowns (client-side fetch) | PASS | `src/app/entry/page.tsx` — fetches `/api/admin/participants` + `/api/admin/staff` on mount |
| `/entry` validates date not in future | PASS | `max` attr set to today; JS guard in `validate()` |
| `/entry` routes to `/restoration?participantId=&staffId=&date=` | PASS | `useRouter().push` with URLSearchParams |
| `/entry` routes to `/mar?participantId=&staffId=&date=` | PASS | Same pattern |
| `/audit-engine` KPI section uses live `/api/audit/kpi` | PASS | `KpiSection` component — `useEffect` fetch on mount, loading/error/empty states |
| `/audit-engine` recent reports from live `/api/audit/gap-report?limit=5` | PASS | `RecentReportsSection` component |
| `/audit-engine` generate flow has no `alert()` usage | PASS | `GenerateSection` — inline error div only |
| `/restoration` weekday map validated before POST | PASS | `useRestoration.onGenerate` — checks all DOW staffIds against `staffOptions` set |
| `/restoration` weekday validation inline (no alert) | PASS | `setErrorText(...)` only |
| Auth-gated APIs return 401 unauthenticated | PASS | All 4 admin/audit APIs confirmed |
| POST-only endpoints return 405 on GET | PASS | `/api/engine/preview` confirmed |

## Summary

All 5 UI routes: **200 PASS**
All API auth gates: **401/405 PASS**
All behavior assumptions for commit `49d0cb06`: **PASS**

**Overall PL-03 smoke gate: PASS**

---

## Gate Commands

Run these in order before any promotion or deploy. All must pass.

```bash
# 1. Lint gate — must exit 0 with 0 errors
npm run lint:report

# 2. Build gate — must compile successfully
npm run build

# 3. Route smoke — all must return 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/entry
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/restoration
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/audit-engine
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/audit-explorer
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/chartgen-core

# 4. Auth gate — must return 401 (unauthenticated)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/audit/kpi
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/audit/gap-report
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/participants
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/staff

# 5. Method gate — POST-only endpoints must return 405 on GET
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/engine/preview
```

**Pass criteria**: lint=0 errors, build=compiled, routes=200, auth=401, method=405.
