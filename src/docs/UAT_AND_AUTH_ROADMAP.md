# UAT and Authentication Roadmap

Last updated: 2026-02-27

## 1) UAT Scope (Online)

Objective: validate production readiness of database, API workflows, and UI stability against the deployed environment.

### UAT tracks

1. Database reliability on Neon.
2. Critical API workflow validation.
3. UI route and export stability.
4. Authentication and authorization rollout readiness.

## 2) Database UAT Plan

### 2.1 Baseline checks

Run:

```bash
npx netlify status
npm run db:health
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma validate
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate status
```

Pass criteria:

- pooled + direct checks visible from `npm run db:health`
- Prisma schema valid
- migration status clean
- Netlify project linked to `chartgen-gubii`

### 2.2 Stress test

Execution paths:

- UI: `/uat` -> `Run Stress Online` (calls `POST /api/ops/uat` with `action: "stress"`)
- CLI: `scripts/stress-db.mjs`

Command:

```bash
npm run db:stress -- --concurrency 30 --duration-sec 90 --mode realistic --max-error-rate 0.02 --max-p95-ms 350
```

Suggested acceptance targets:

- error rate <= 2%
- p95 <= 350 ms
- p99 <= 800 ms
- no sustained connectivity failures

### 2.3 Cleanup procedure

Execution paths:

- UI: `/uat` cleanup dry-run + confirmation-gated apply (`POST /api/ops/uat` with `action: "cleanup"`)
- CLI: `scripts/cleanup-uat-data.mjs`

Dry-run first:

```bash
npm run db:cleanup:uat -- --participant-key 112334 --older-than-days 2
```

Apply only with explicit confirmation gate:

```bash
CONFIRM_UAT_CLEANUP=YES npm run db:cleanup:uat -- --participant-key 112334 --older-than-days 2 --apply
```

Safety controls:

- default mode is dry-run
- UI apply mode requires exact confirmation phrase returned by dry-run
- CLI destructive mode requires `--apply`
- CLI destructive mode also requires `CONFIRM_UAT_CLEANUP=YES`
- both flows emit JSON report artifacts

## 3) API and UI UAT

### API smoke path

1. meal preview -> approve -> commit
2. MAR preview -> approve -> commit
3. export PDF on both meal and MAR pages

### UI checks

1. `/`, `/mar`, `/mealtime-chartgen`, `/restoration`, `/kpigen`, `/uat`
2. `/uat` can run DB health, stress, cleanup dry-run, and cleanup apply
3. cleanup apply enforces required confirmation phrase
4. artifact download button exports latest run report JSON
5. table sorting behavior works on UAT page

## 4) Authentication Status and Next Phases

### Current implementation (live)

1. Session model:
   - signed cookie (`gwc_session`) using HMAC + Web Crypto
   - roles supported: `full`, `guest`
   - token expiry enforced (`exp`)
2. Login routes:
   - `POST /api/auth/login` issues session cookie
   - `GET /api/auth/check` returns active role
   - `POST /api/auth/logout` clears session
3. Route protection:
   - `middleware.ts` blocks protected routes for anonymous traffic
   - guest users are restricted to read-only preview pages/APIs
   - full users can access all modules

### Environment requirements

- `SITE_PASSWORD` for full-access login gate
- `SESSION_SECRET` for production-grade session signing

### Next auth phases

1. Identity upgrade:
   - replace shared password with per-user identities
   - map sessions directly to `Staff` records
2. Security hardening:
   - login attempt throttling/rate limiting
   - failed login event logging
   - session rotation + forced expiry policy
3. Governance traceability:
   - auth event audit stream (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`)
   - role elevation/change review hooks

### Current auth acceptance criteria

- login works with persistent session
- protected routes reject anonymous traffic
- guest vs full access boundaries are enforced by middleware
- logout clears session cookie

## 5) UI Library Direction

### Current enhancement adopted

- `@tanstack/react-table` integrated for sortable UAT representation.

### Next recommended enhancement

Use `shadcn/ui` primitives on top of Radix + Tailwind for:

- consistent form controls
- higher-fidelity modal/dialog patterns
- composable data table shells

Rollout sequence:

1. adopt button/input/select primitives
2. refactor UAT controls to standardized components
3. migrate high-traffic workflow pages incrementally
