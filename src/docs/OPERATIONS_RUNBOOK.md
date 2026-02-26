# Operations Runbook

Last updated: 2026-02-26

## 1) Process and Port Checks

```bash
ps aux | rg -i "next dev|next start|node .*next|turbopack" | rg -v rg
lsof -nP -iTCP -sTCP:LISTEN | rg "3000|4000|5432"
brew services list | rg -i "postgres"
```

## 2) Start/Stop App

### Dev mode

```bash
cd /Users/moofasa/chartgen
npm run dev
```

### Production start mode (after build)

```bash
cd /Users/moofasa/chartgen
npm run build
npm run start -- -p 4000
```

### Stop app servers

```bash
pkill -f "/Users/moofasa/chartgen/node_modules/.bin/next dev" || true
pkill -f "next start -p 4000" || true
```

## 3) Database Health

```bash
cd /Users/moofasa/chartgen
npx prisma validate
npx prisma migrate status
```

If local DB was reset:

```bash
cd /Users/moofasa/chartgen
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

## 4) Smoke Test Checklist

### Meal workflow

1. `POST /api/engine/preview`
2. `PATCH /api/engine/preview` with `approveAll=true`
3. `POST /api/engine/commit`

Expected:

- preview returns `ok: true` + `batchId`
- approve returns `approvedCount > 0`
- commit returns `mealCommitted >= 0`

### MAR workflow

1. `POST /api/engine/mar-preview`
2. `PATCH /api/engine/mar-preview` with `approveAll=true`
3. `POST /api/engine/commit`

Expected:

- preview returns `ok: true` + `batchId`
- approve returns `approvedCount > 0`
- commit returns `marCommitted >= 0` (MAR-only batch is valid)

## 5) Governance Error Handling

### `FORBIDDEN_ROLE` during `approveAll`

Cause:

- `actorStaffId` exists but role is not `SUPERVISOR` or `CLINICAL_LEAD`

Fix:

- use supervisor/clinical lead staff ID

### `SELF_APPROVAL_FORBIDDEN` during `approveAll`

Cause:

- actor is same staff member as batch generator (`requestedByStaffId`)

Fix:

- use a different elevated reviewer

### `ACTOR_NOT_FOUND`

Cause:

- `actorStaffId` has no matching `Staff` row

Fix:

- create or use a valid staff record

## 6) Commit Error Handling

### `NO_APPROVED_CANDIDATES`

Cause:

- batch has no approved meal or MAR candidates

Fix:

- run `approveAll` first for that batch

### `BATCH_ALREADY_COMMITTED`

Cause:

- ledger rows already written for that batch (`source = RESTORED_APPROVED`)

Fix:

- do not re-commit the same batch; generate a new batch

### `PROVENANCE_HASH_MISMATCH`

Cause:

- candidate data changed without matching hash recomputation

Fix:

- re-save candidate through supported PATCH route before commit

### `DATABASE_UNAVAILABLE`

Cause:

- database unreachable from Prisma client

Fix:

1. confirm PostgreSQL service is running
2. verify `DATABASE_URL` in `.env`
3. restart app after env changes

## 7) Seed Baseline IDs

From `prisma/seed.cjs`:

- Supervisor: `32213`
- Participant: `112334`

## 8) Testing Reality

- `npm run test:governance` is available for executable approval-governance integration checks.
- `npm test` is still a placeholder script and is not a reliable gate.
- Recommended current gate: build + Prisma checks + `npm run test:governance` + API smoke tests.
- See `src/docs/QUALITY_AND_TESTING.md` for details and next maturity steps.
