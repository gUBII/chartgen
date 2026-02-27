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
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma validate
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate status
```

Pass criteria:

- Prisma schema valid
- migration status clean
- Netlify project linked to `chartgen-gubii`

### 2.2 Stress test

Script:

- `scripts/stress-db.mjs`

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

Script:

- `scripts/cleanup-uat-data.mjs`

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
- destructive mode requires `--apply`
- destructive mode also requires `CONFIRM_UAT_CLEANUP=YES`

## 3) API and UI UAT

### API smoke path

1. meal preview -> approve -> commit
2. MAR preview -> approve -> commit
3. export PDF on both meal and MAR pages

### UI checks

1. `/`, `/mar`, `/mealtime-chartgen`, `/restoration`, `/kpigen`, `/uat`
2. UAT command generation buttons copy expected commands
3. table sorting behavior works on UAT page

## 4) New Login and Authentication Plan

### Recommendation

Use Auth.js (NextAuth) with Prisma adapter.

Reason:

- native fit for Next.js App Router
- mature session strategies
- easy role-based gate extension using existing `StaffRole`

### Proposed implementation phases

1. Foundation:
   - install `next-auth` and Prisma adapter
   - create auth tables/migrations
   - add sign-in page and session provider
2. Route protection:
   - middleware for protected API/page routes
   - unauthenticated users redirected to login
3. Role authorization:
   - map authenticated user to `Staff`
   - enforce `SUPERVISOR`/`CLINICAL_LEAD` role checks server-side
4. Hardening:
   - audit auth events
   - brute-force/rate-limit strategy
   - session timeout/rotation policy

### Minimal auth MVP acceptance criteria

- login works with persistent session
- protected routes reject anonymous traffic
- commit + approval actions require authorized roles
- logout fully clears session

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
