# ChartGen

Last updated: 2026-02-26

Clinical mealtime and medication restoration + audit-ledger control center built with Next.js, Prisma, and PostgreSQL.

## Current Truth

ChartGen currently implements:

- Meal preview generation (`POST /api/engine/preview`)
- MAR preview generation (`POST /api/engine/mar-preview`)
- Candidate editing (`PATCH` on both preview routes)
- Batch approval (`approveAll`) with governance controls
- Transactional commit into official ledger (`POST /api/engine/commit`)
- Provenance hash verification and audit-event chaining

### Approval governance now enforced

For `approveAll` in both meal and MAR routes:

- `actorStaffId` is required
- actor must have role `SUPERVISOR` or `CLINICAL_LEAD`
- actor cannot approve a batch they generated (`SELF_APPROVAL_FORBIDDEN`)

### Commit semantics now enforced

`POST /api/engine/commit`:

- requires elevated role (`SUPERVISOR` or `CLINICAL_LEAD`)
- verifies candidate provenance hashes before any ledger write
- blocks duplicate commit of the same batch
- commits approved **meal**, approved **MAR**, or both
- writes `AuditEvent` (`LEDGER_WRITTEN`) with previous-hash linkage

### MAR status model

`MARStatus` now includes:

- `ADMINISTERED`
- `REFUSED`
- `HELD`

Migration applied:

- `prisma/migrations/20260226120823_add_held_to_mar_status/migration.sql`

## High-Level Flow

1. Generate candidates into a `RestorationBatch` (`PENDING`).
2. Review/edit candidate rows.
3. Approve candidates via `approveAll` with governance checks.
4. Commit approved candidates to `MealLog`/`MARLog` (`source = RESTORED_APPROVED`).
5. Record append-only `AuditEvent` for traceability.

## Routes

### Pages

- `GET /` - landing page
- `GET /restoration` - meal chart control center
- `GET /mar` - medication chart (MAR) control center

### API

- `POST /api/engine/preview` - generate meal candidates
- `PATCH /api/engine/preview` - edit meal candidate or `approveAll`
- `POST /api/engine/mar-preview` - generate MAR candidates
- `PATCH /api/engine/mar-preview` - edit MAR candidate or `approveAll`
- `POST /api/engine/commit` - commit approved candidates to ledger

## Local Setup

### 1) Install

```bash
cd /Users/moofasa/chartgen
npm install
```

### 2) Configure DB

Set `.env`:

```bash
DATABASE_URL="postgresql://admin:password123@localhost:5432/chartgen_audit?schema=public"
```

### 3) Migrate + generate + seed

```bash
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

### 4) Run

```bash
npm run dev
```

Open:

- `http://localhost:3000/restoration`
- `http://localhost:3000/mar`

## Seed Baseline IDs

From `prisma/seed.cjs`:

- Supervisor Staff ID: `32213`
- Participant ID: `112334`

## Verification Commands

```bash
npm run build
npx prisma validate
npx prisma migrate status
```

## API Smoke Examples

### Meal preview -> approve -> commit

```bash
# Preview
curl -X POST http://localhost:3000/api/engine/preview \
  -H "Content-Type: application/json" \
  -d '{"participantId":"112334","generatedByStaffId":"32213","startDate":"2026-02-20","endDate":"2026-02-22"}'

# Approve all
curl -X PATCH http://localhost:3000/api/engine/preview \
  -H "Content-Type: application/json" \
  -d '{"approveAll":true,"batchId":"<meal-batch-id>","actorStaffId":"32213"}'

# Commit
curl -X POST http://localhost:3000/api/engine/commit \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<meal-batch-id>","actorStaffId":"32213"}'
```

### MAR preview -> approve -> commit

```bash
# MAR preview
curl -X POST http://localhost:3000/api/engine/mar-preview \
  -H "Content-Type: application/json" \
  -d '{"participantId":"112334","generatedByStaffId":"32213","startDate":"2026-02-20","endDate":"2026-02-22","medications":[{"name":"Aspirin","dosage":"100mg","route":"PO","hour":8,"minute":0}]}'

# Approve all
curl -X PATCH http://localhost:3000/api/engine/mar-preview \
  -H "Content-Type: application/json" \
  -d '{"approveAll":true,"batchId":"<mar-batch-id>","actorStaffId":"32213"}'

# Commit (MAR-only batches are supported)
curl -X POST http://localhost:3000/api/engine/commit \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<mar-batch-id>","actorStaffId":"32213"}'
```

## Quality and Testing Truth

- `npm run test:governance` runs executable governance integration checks against a running API server.
- `npm test` remains a placeholder and is not wired to a framework suite yet.
- `src/app/api/engine/__tests__/approveAll.test.ts` exists as a draft but is not runnable in current tooling.
- Current verification is build + Prisma validation + `npm run test:governance` + runtime API smoke testing.

See: `src/docs/QUALITY_AND_TESTING.md`.

## Documentation Map

- `src/docs/README.md` - docs index
- `src/docs/ARCHITECTURE_REFERENCE.md` - architecture and route behavior
- `src/docs/RESTORATION_ENGINE_NOTES.md` - realism model details
- `src/docs/OPERATIONS_RUNBOOK.md` - operations and troubleshooting
- `src/docs/QUALITY_AND_TESTING.md` - testing reality and quality gates
- `src/docs/TECHNOLOGY_CONTEXT.md` - design principles and constraints
- `src/docs/PHASE1_AUDIT.md` - historical audit record with closure status
