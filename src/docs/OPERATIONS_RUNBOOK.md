# Operations Runbook

Last updated: 2026-03-01

## 0) Current Live Links (Verified 2026-02-28)

- Production app: https://chartgen-gubii.netlify.app
- Main deploy alias: https://main--chartgen-gubii.netlify.app
- Netlify admin: https://app.netlify.com/projects/chartgen-gubii
- GitHub repo: https://github.com/gUBII/chartgen

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
npm run db:health
npm run db:health:trend -- --url https://chartgen-gubii.netlify.app --samples 3 --interval 1 --cookie "gwc_session=<full-session-token>"
npx prisma validate
npx prisma migrate status
```

Recommended for Neon setup (both URLs required by Prisma datasource config):

```bash
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma validate
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://...direct..." npx prisma migrate status
```

`npm run db:health` returns pooled/direct connectivity, latency, and remediation hints. Exit code `2` indicates degraded status.

If local DB was reset:

```bash
cd /Users/moofasa/chartgen
npx prisma migrate dev
npx prisma generate
npx prisma db seed
```

## 4) Smoke Test Checklist

### Restoration workflow

1. `POST /api/engine/preview`
2. `PATCH /api/engine/preview` with `approveAll=true`
3. `POST /api/engine/commit`

Expected:

- preview returns `ok: true` + `batchId` + module log arrays (`sleepLogs`, `bglLogs`, `bowelLogs`, `hygieneLogs`, `communityLogs`, `repositionLogs`)
- approve returns `approvedCount > 0`
- commit returns grouped counts across all included families

### MAR workflow

1. `POST /api/engine/mar-preview`
2. `PATCH /api/engine/mar-preview` with `approveAll=true`
3. `POST /api/engine/commit`

Expected:

- preview returns `ok: true` + `batchId`
- approve returns `approvedCount > 0`
- commit returns `marCommitted >= 0` (MAR-only batch is valid)

## 5) Authentication Troubleshooting

### "Still redirected to /login after successful login"

1. Check `/api/auth/check` endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/auth/check \
     -H "Cookie: gwc_session=<your-token>"
   ```
   Expected response: `{ "authenticated": true, "role": "full" }` or `{ "authenticated": true, "role": "guest" }`

2. Verify SITE_PASSWORD is set and matches login attempt:
   ```bash
   echo $SESSION_SECRET # Should not be empty
   ```

3. Check browser/curl cookie format:
   - **Correct:** `gwc_session=<token-only>`
   - **Incorrect:** `gwc_session=gwc_session=<token>` (double-prefix)

4. Session TTL: Re-login if token is older than `SESSION_TTL_SEC` (default 7 days):
   ```bash
   echo $SESSION_TTL_SEC  # Check configured value
   ```

### Restricted Routes Return 307 Redirect

Pages like `/restoration`, `/audit-engine`, `/audit-explorer` redirect unauthenticated users to `/login`. This is expected behavior. Ensure:
- Valid session cookie is set (`gwc_session` or fallback `session`)
- Role is `full` (not `guest`) for full-access routes
- Session has not expired (check `SESSION_TTL_SEC`)

## 6) Online UAT Ops APIs

Protected endpoints (full-login required):

- `GET /api/ops/db-health`
- `POST /api/ops/uat`

Sample calls:

```bash
# health
curl -X GET http://localhost:3000/api/ops/db-health

# stress
curl -X POST http://localhost:3000/api/ops/uat \
  -H "Content-Type: application/json" \
  -d '{"action":"stress","concurrency":20,"durationSec":45,"mode":"simple","maxErrorRate":0.02,"maxP95Ms":350}'

# cleanup dry-run
curl -X POST http://localhost:3000/api/ops/uat \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup","participantKey":"112334","olderThanDays":2,"includeLive":false,"apply":false}'
```

Cleanup apply requires the exact `requiredConfirmationText` returned by dry-run.

## 7) Governance Error Handling

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

## 8) Commit Error Handling

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

## 9) Seed Baseline IDs

From `prisma/seed.cjs`:

- Supervisor: `32213`
- Participant: `112334`

## 10) Testing Reality

- `npm run test:governance` is available for executable approval-governance integration checks.
- `npm test` is still a placeholder script and is not a reliable gate.
- `npm run lint` now uses ESLint flat config (`eslint.config.mjs`) and is the supported lint gate for this Next 16 stack.
- Recommended current gate: lint + build + Prisma checks + `npm run test:governance` + API smoke tests.
- See `src/docs/QUALITY_AND_TESTING.md` for details and next maturity steps.

## 11) Agent Handshake Verification

**Roles:**
- **Codex:** Program Director + Release Governor (dispatch + acceptance authority)
- **Claude:** Principal Builder (complex implementation when dispatched)
- **Gemini:** Independent QA Verifier + Docs/Diagram Lead

Protocol docs:

- `/Users/moofasa/chartgen/claude.md`
- `/Users/moofasa/chartgen/gemini.md`

Runtime logs:

- `/tmp/codex_claude_handshake.log`
- `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

Standard message format:

```text
INSTRUCTION [UUID]
<task description>

RESULT [UUID]
<status/output>
```

Quick check commands:

```bash
tail -n 80 /tmp/codex_claude_handshake.log
tail -n 80 /Users/moofasa/chartgen/handoff/gemini_handshake.md
rg -n "INSTRUCTION|RESULT|DIGEST" /tmp/codex_claude_handshake.log
rg -n "INSTRUCTION|RESULT|DIGEST" /Users/moofasa/chartgen/handoff/gemini_handshake.md
```

Rules:

- keep protocol guidance in `.md` files only
- keep runtime execution records in canonical handshake logs (`/tmp` for Claude, `handoff/` for Gemini)
- each `RESULT` starts with role/name
- reject placeholder/template-only `RESULT` messages
- prefer non-interactive commands when assigning agent checks
