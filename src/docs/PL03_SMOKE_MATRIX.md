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
| `/chartgen-core` | GET | 200 | 200 | PASS |

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
