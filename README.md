# ChartGen

Clinical mealtime/medication restoration and audit-ledger control center built with Next.js + Prisma + PostgreSQL.

This repository implements:
- Candidate generation for recovery windows.
- Supervisor review/edit workflow.
- Transactional commit into official ledger.
- Provenance hash verification and audit-event logging.

---

## 1. System Purpose

ChartGen supports restoration workflows where historical chart rows need controlled reconstitution and explicit human review before entering production logs.

Primary flow:
1. Generate preview candidates (`PENDING`).
2. Review and edit candidate rows.
3. Approve candidate rows.
4. Commit approved rows into immutable ledger logs with `source = RESTORED_APPROVED`.
5. Write `AuditEvent` for traceability.

---

## 2. Technology Stack

### Runtime and Framework
- **Node.js** (local tested with Node 25; recommended Node 20 LTS for long-term stability)
- **Next.js 16.1.6** (App Router, Turbopack)
- **React 19.2.4**
- **TypeScript 5.9.x**

### Data and ORM
- **PostgreSQL 16**
- **Prisma 6.17.1** (schema, migrations, client generation, seed)

### Frontend Styling
- **Tailwind CSS v4**
- **PostCSS** via `@tailwindcss/postcss`

### Local Infrastructure
- Homebrew service (`postgresql@16`) and optional Docker compose fallback (`docker-compose.yml`)

---

## 3. High-Level Architecture

```mermaid
flowchart LR
    UI["/restoration UI"] --> PREVIEW["POST /api/engine/preview"]
    PREVIEW --> BATCH["RestorationBatch (PENDING)"]
    PREVIEW --> CAND["RestoredMealCandidate (PENDING)"]

    UI --> PATCH["PATCH /api/engine/preview"]
    PATCH --> CAND

    UI --> APPROVE["PATCH /api/engine/preview (approveAll)"]
    APPROVE --> CANDAPP["RestoredMealCandidate (APPROVED)"]

    UI --> COMMIT["POST /api/engine/commit"]
    COMMIT --> VERIFY["Recompute + verify provenanceHash"]
    VERIFY --> MEALLOG["MealLog (RESTORED_APPROVED)"]
    COMMIT --> BATCHUPD["RestorationBatch status update"]
    COMMIT --> AUDIT["AuditEvent: LEDGER_WRITTEN"]
```

---

## 4. Data Model (ERD)

```mermaid
erDiagram
    PARTICIPANT ||--o{ RESTORATION_BATCH : has
    STAFF ||--o{ RESTORATION_BATCH : requested_by
    STAFF ||--o{ RESTORATION_BATCH : reviewed_by

    RESTORATION_BATCH ||--o{ RESTORED_MEAL_CANDIDATE : contains
    PARTICIPANT ||--o{ RESTORED_MEAL_CANDIDATE : has
    STAFF ||--o{ RESTORED_MEAL_CANDIDATE : generated_by
    STAFF ||--o{ RESTORED_MEAL_CANDIDATE : reviewed_by

    RESTORATION_BATCH ||--o{ RESTORED_MAR_CANDIDATE : contains
    PARTICIPANT ||--o{ RESTORED_MAR_CANDIDATE : has
    STAFF ||--o{ RESTORED_MAR_CANDIDATE : generated_by
    STAFF ||--o{ RESTORED_MAR_CANDIDATE : reviewed_by

    PARTICIPANT ||--o{ MEAL_LOG : has
    STAFF ||--o{ MEAL_LOG : created_by
    STAFF ||--o{ MEAL_LOG : approved_by
    RESTORATION_BATCH ||--o{ MEAL_LOG : committed_from

    PARTICIPANT ||--o{ MAR_LOG : has
    STAFF ||--o{ MAR_LOG : created_by
    STAFF ||--o{ MAR_LOG : approved_by
    RESTORATION_BATCH ||--o{ MAR_LOG : committed_from

    STAFF ||--o{ AUDIT_EVENT : actor
    PARTICIPANT ||--o{ AUDIT_EVENT : scoped_to
```

---

## 5. Route Inventory

### Pages
- `GET /` - landing entry
- `GET /restoration` - control center (generate, edit, approve, commit)

### API
- `POST /api/engine/preview`
  - Generates preview candidates using restoration engine.
  - Persists to `RestoredMealCandidate` with `status = PENDING`.
  - Returns `{ batchId, candidates }`.

- `PATCH /api/engine/preview`
  - Mode A: update one row (`candidateId`, `amountEaten`, `timestamp`) and recompute `provenanceHash`.
  - Mode B: approve all rows for a batch (`approveAll=true`, `batchId`) -> `status = APPROVED`.

- `POST /api/engine/commit`
  - Requires `actorStaffId` role in `{ SUPERVISOR, CLINICAL_LEAD }`.
  - Reads approved candidates for batch.
  - Recomputes and validates hashes.
  - Writes ledger rows (`MealLog`).
  - Updates batch review state.
  - Emits `AuditEvent` record.
  - Executed inside Prisma transaction.

---

## 6. Core Components and Files

### API
- `src/app/api/engine/preview/route.ts`
- `src/app/api/engine/commit/route.ts`

### UI
- `src/app/restoration/page.tsx`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

### Domain Logic
- `src/services/restoration/restorationEngine.ts`
- `src/services/restoration/temporalRealism.ts`
- `src/services/restoration/reviewWorkflow.ts`
- `src/lib/validation/mealValidation.ts`
- `src/lib/prisma.ts`

### Database
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.cjs`

---

## 7. Sequence Diagram: Commit Transaction

```mermaid
sequenceDiagram
    participant UI as Restoration UI
    participant API as /api/engine/commit
    participant DB as PostgreSQL (Prisma TX)

    UI->>API: POST {batchId, actorStaffId}
    API->>DB: Find actor + role check
    API->>DB: Read batch
    API->>DB: Read approved candidates
    API->>API: Recompute provenance hash for each row
    API->>DB: Insert MealLog rows
    API->>DB: Update RestorationBatch status/reviewer
    API->>DB: Insert AuditEvent(LEDGER_WRITTEN)
    DB-->>API: Transaction commit
    API-->>UI: {ok: true, counts, auditEventId}
```

---

## 8. Local Setup (Authoritative)

### 8.1 Install dependencies
```bash
cd /Users/moofasa/chartgen
npm install
```

### 8.2 Ensure PostgreSQL is running
```bash
brew services start postgresql@16
brew services list | rg postgresql@16
```

### 8.3 Configure environment
`.env`:
```bash
DATABASE_URL="postgresql://admin:password123@localhost:5432/chartgen_audit?schema=public"
```

### 8.4 Apply schema and generate Prisma client
```bash
npx prisma migrate dev --name init_audit_schema
npx prisma generate
```

### 8.5 Seed baseline records
```bash
npx prisma db seed
```

### 8.6 Run app
```bash
npm run dev
```
Open: `http://localhost:3000/restoration`

---

## 9. Seeded Test Identities

- Supervisor Staff ID: `32213`
- Participant ID: `112334`

Use these directly in the control center form.

---

## 10. Build and Verification

### Build
```bash
npm run build
```

### Prisma validation
```bash
npx prisma validate
npx prisma migrate status
```

### API smoke tests
```bash
# Preview
curl -X POST http://localhost:3000/api/engine/preview \
  -H "Content-Type: application/json" \
  -d '{"participantId":"112334","generatedByStaffId":"32213","startDate":"2026-01-23","endDate":"2026-01-25"}'

# Approve all in batch
curl -X PATCH http://localhost:3000/api/engine/preview \
  -H "Content-Type: application/json" \
  -d '{"approveAll":true,"batchId":"<batch-id>","actorStaffId":"32213"}'

# Commit
curl -X POST http://localhost:3000/api/engine/commit \
  -H "Content-Type: application/json" \
  -d '{"batchId":"<batch-id>","actorStaffId":"32213"}'
```

---

## 11. Findings Summary (Checkpoint)

### Resolved
1. **Schema mismatch** between basic and audit-ready models was resolved by standardizing on audit-ready schema.
2. **Infrastructure gap** (`localhost:5432` unavailable) resolved via local PostgreSQL setup and DB provisioning.
3. **Preview API missing** resolved via `POST/PATCH /api/engine/preview`.
4. **Commit safety controls** implemented:
   - role checks
   - transactional writes
   - provenance hash verification
   - audit-event writes
5. **UI control center** implemented for generation/edit/commit workflow.

### Remaining Technical Debt
1. `package.json#prisma` seed config is deprecated for Prisma 7; migrate to `prisma.config.ts`.
2. Optional route hardening middleware can be added for centralized RBAC.
3. Commit currently writes Meal logs; MAR commit path can be expanded as restoration logic matures.

---

## 12. Known Warnings and Their Meaning

- Cross-origin dev warning (`allowedDevOrigins`) from Next.js during local LAN access:
  - informational for future Next major versions
  - does not block current functionality

- Prisma deprecation warning:
  - `package.json#prisma` to be replaced by `prisma.config.ts` in Prisma 7
  - current setup still works on Prisma 6.17.1

---

## 13. Operations: Relevant PIDs / Restart Commands

### Inspect
```bash
ps aux | rg -i "next dev|next start|node .*next|turbopack" | rg -v rg
lsof -nP -iTCP -sTCP:LISTEN | rg "3000|3001|4000|5432"
```

### Stop app servers
```bash
pkill -f "/Users/moofasa/chartgen/node_modules/.bin/next dev" || true
pkill -f "next start -p 4000" || true
```

### Fresh build/run
```bash
cd /Users/moofasa/chartgen
npm run build
npm run dev
```

---

## 14. Documentation Map

- `src/docs/ARCHITECTURE_REFERENCE.md` - deep architecture + route and ER diagrams.
- `src/docs/OPERATIONS_RUNBOOK.md` - operations and troubleshooting.
- `src/docs/PHASE1_AUDIT.md` - audit analysis and red flags.
- `src/docs/RESTORATION_ENGINE_NOTES.md` - generation/distribution behavior.
- `src/docs/TECHNOLOGY_CONTEXT.md` - concise stack and compliance rationale.
