# Chartgen by gUBII

Last updated: 2026-02-27

Governance-first clinical documentation audit modelling platform for NDIS-aligned environments, built with Next.js, Prisma, and PostgreSQL.

## Live Links (Verified 2026-02-27)

- Production app: https://chartgen-gubii.netlify.app
- Main deploy alias: https://main--chartgen-gubii.netlify.app
- Netlify admin: https://app.netlify.com/projects/chartgen-gubii
- GitHub repo: https://github.com/gUBII/chartgen
- Creator GitHub: https://github.com/gUBII

## Current Release

- `v3.2.0` (staged feature ledger available at `/whats-new` and `src/docs/RELEASE_HISTORY.md`)
- Latest `v3.2` patch includes optional mobile dropdown nav and compact mobile header spacing.
- Auth hydration now reads `gwc_session` (with `session` fallback) to reduce first-paint role mismatch.

## Current Truth

Chartgen currently implements:

- Meal preview generation (`POST /api/engine/preview`)
- MAR preview generation (`POST /api/engine/mar-preview`)
- Candidate editing (`PATCH` on both preview routes)
- Batch approval (`approveAll`) with governance controls
- Transactional commit into official ledger (`POST /api/engine/commit`)
- Provenance hash verification and audit-event chaining
- Signed cookie session auth with role-aware access (`full` and `guest`)
- Protected Ops API for online DB health checks and UAT execution
- UAT JSON artifact persistence for stress/cleanup runs

### Brand and deployment clarity

- Product ownership: Chartgen is independently authored by Farhan Rashid (gUBII)
- Deployment environments: GoodwillCare and COHS instances run in Nexis365-hosted infrastructure
- Platform boundary: Nexis365 provides hosting/platform capabilities; product governance remains independent

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
- `GET /whats-new` - full version timeline from `v1.0` to `v3.2`
- `GET /login` - access-control login page
- `GET /deployment-notes` - deployment and hosting boundary notes
- `GET /audit-readiness` - audit-modelling and readiness framing
- `GET /mealtime-chartgen` - mealtime chart module
- `GET /restoration` - meal chart control center
- `GET /mar` - medication chart (MAR) control center
- `GET /uat` - online UAT control center (health check + stress + cleanup runners)

### API

- `POST /api/engine/preview` - generate meal candidates
- `PATCH /api/engine/preview` - edit meal candidate or `approveAll`
- `POST /api/engine/mar-preview` - generate MAR candidates
- `PATCH /api/engine/mar-preview` - edit MAR candidate or `approveAll`
- `POST /api/engine/commit` - commit approved candidates to ledger
- `GET /api/ops/db-health` - protected pooled/direct DB connectivity probe
- `POST /api/ops/uat` - protected online stress and cleanup execution endpoint

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
DIRECT_URL="postgresql://admin:password123@localhost:5432/chartgen_audit?schema=public"
SITE_PASSWORD="set-a-strong-password-for-full-access"
SESSION_SECRET="replace-with-long-random-secret"
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
- `http://localhost:3000/uat`

## Seed Baseline IDs

From `prisma/seed.cjs`:

- Supervisor Staff ID: `32213`
- Participant ID: `112334`

## Verification Commands

```bash
npm run build
npm run lint
npm run lint:report
npm run lint:strict
npm run db:health
npm run db:health:trend -- --url https://chartgen-gubii.netlify.app --samples 3 --interval 1 --cookie "gwc_session=<full-session-token>"
npm run agent:check:result -- /tmp/codex_claude_handshake.log <UUID>
npm run agent:check:result -- /tmp/codex_gemini_handshake.log <UUID>
npx prisma validate
npx prisma migrate status
npm run db:stress -- --concurrency 20 --duration-sec 45 --mode simple
npm run db:cleanup:uat -- --participant-key 112334
```

## Lint Modes

- `npm run lint`
  - Existing local policy (`--max-warnings=15`), useful for day-to-day work.
- `npm run lint:report`
  - Non-blocking lint report; always exits `0`.
- `npm run lint:strict`
  - Strict gate for CI/release checks (`--max-warnings=0`).

## Online UAT Automation

- `/uat` now executes online operations via protected APIs (full-login required):
  - `GET /api/ops/db-health`
  - `POST /api/ops/uat` with `action: "stress"`
  - `POST /api/ops/uat` with `action: "cleanup"` (`DRY_RUN` + confirmation-gated `APPLY`)
- Trend monitor command (JSON summary + non-zero on degraded samples):
  - `npm run db:health:trend -- --url https://chartgen-gubii.netlify.app --samples 5 --interval 10 --cookie "gwc_session=<full-session-token>"`
  - Output keys: `samples`, `warning_count`, `degraded_count`, `pooled_max_ms`, `direct_max_ms`, `final_status`
- Each online run writes a JSON artifact with timestamp and commit reference.
- Default artifact directory:
  - local: `reports/uat`
  - Netlify runtime: `/tmp/chartgen-uat-reports`

## Netlify Deployment

### Prerequisites

1. PostgreSQL database instance (Supabase, AWS RDS, Railway, Neon, etc.)
2. GitHub repository pushed to main branch
3. Netlify account connected to GitHub

### Environment Variables

Set these in Netlify Dashboard (Settings > Build & Deploy > Environment):

#### Database
```
DATABASE_URL=postgresql://user:password@endpoint-pooler.region.aws.neon.tech/dbname?sslmode=require
DIRECT_URL=postgresql://user:password@endpoint.region.aws.neon.tech/dbname?sslmode=require
```

#### Authentication
```
SESSION_SECRET=<long-random-string-for-HMAC-signing>
SESSION_TTL_SEC=604800
```

- `SESSION_SECRET`: HMAC signing key for session tokens (required). Use a long random string (32+ chars).
- `SESSION_TTL_SEC`: Session time-to-live in seconds (optional, default: 604800 = 7 days). Invalid or non-positive values fallback to default.
- **Cookie parity**: Sessions read `gwc_session` first, then fallback to legacy `session` cookie for backward compatibility.

### Build Context

`netlify.toml` runs `npm run build` for production and preview contexts.

Database migrations are intentionally run outside the build step so production deploys do not fail when DB credentials are missing or invalid at build time.

### Online Database Plan (Neon)

1. Create/confirm Neon project + database in region closest to Netlify runtime.
2. Reset the database user password in Neon.
3. Build fresh Neon connection strings:

```bash
DATABASE_URL=postgresql://<user>:<url-encoded-password>@<endpoint>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
DIRECT_URL=postgresql://<user>:<url-encoded-password>@<endpoint>.<region>.aws.neon.tech/<db>?sslmode=require
```

4. Validate credentials from this repo (use `DIRECT_URL` for Prisma CLI):

```bash
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate status
```

5. Apply migrations:

```bash
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate deploy
```

6. Optional: seed baseline data:

```bash
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma db seed
```

### Deployment Steps

**Via Netlify UI:**

1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git" > Connect GitHub > Select `gUBII/chartgen`
3. Build command auto-fills to `npm run build`
4. Publish directory: `.next`
5. Click Deploy
6. After deploy, go Settings > Build & Deploy > Environment
7. Add both `DATABASE_URL` and `DIRECT_URL` environment variables
8. Trigger production redeploy via Deploys tab
9. Run migrations from a terminal using both URLs

**Via Netlify CLI:**

```bash
npm install -g netlify-cli
netlify login
netlify env:set DATABASE_URL "postgresql://user:password@endpoint-pooler.region.aws.neon.tech/dbname?sslmode=require" --context production
netlify env:set DIRECT_URL "postgresql://user:password@endpoint.region.aws.neon.tech/dbname?sslmode=require" --context production
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate deploy
netlify deploy --prod --trigger
```

### Verification

After successful production deploy:

1. `npx netlify status` shows the correct linked project and production URL
2. Visit deployed site (e.g., `https://chartgen-gubii.netlify.app`)
3. Test `/mar` endpoint: Generate and download PDF
4. Test `/restoration` endpoint: Verify database writes
5. Monitor Netlify function logs for errors

### Rollback

If deployment fails:
- Re-run `netlify deploy --prod` with corrected DATABASE_URL
- Check PostgreSQL connectivity and permissions
- Verify migrations ran successfully via `DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate status`

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
- `src/docs/UAT_AND_AUTH_ROADMAP.md` - UAT execution plan plus login/auth rollout roadmap
- `LATEST_LINKS_AND_INSTRUCTIONS.txt` - one-file live links and operational command checklist
