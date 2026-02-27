# Gemini Communication Channel

## Channel
- Handshake log file: `/tmp/codex_gemini_handshake.log`
- Message format:
  - `INSTRUCTION [UUID]`
  - task details
  - `RESULT [UUID]`
  - concrete output

## Instruction Rules
- Focus on diagnostics, validation, and independent cross-checking.
- Always include:
  - target scope
  - exact checks/commands
  - response schema
- Keep responses concise and evidence-first.

## Required Result Format
- Status: `PASS` / `FAIL` / `BLOCKED`
- Observations (facts only)
- Command/output summary
- Risk notes
- Recommended next step

## Standard Task Template
```text
INSTRUCTION [<UUID>]
Objective: <one sentence>
Scope: <files/services/endpoints>
Checks:
1) <command/check>
2) <command/check>
Reply format:
RESULT [<UUID>]
Status: <PASS|FAIL|BLOCKED>
Observations:
- <fact>
Evidence:
- <command>: <key output>
Risks: <none|details>
Next: <single recommended next step>
```

---

RESULT [0F8FBAEE-2BB2-4BB0-9C86-0BC80D587C46]
Status: FAIL
Observations:
- Database health status is 'degraded'.
- Pooled connection is OK (target: localhost:5432/chartgen_audit).
- Direct migration connection is failing (target: ep-steep-art-aikjoepb.c-4.us-east-1.aws.neon.tech/neondb).
- Prisma schema is valid.
- Auth middleware is correctly enforcing roles: full (RW), guest (RO), and anonymous (Blocked).
- SITE_PASSWORD is correctly configured as 'free'.
Evidence:
- `npm run db:health`: {"status":"degraded","alerts":[{"severity":"critical","code":"DIRECT_UNAVAILABLE"}]}
- `npx prisma validate`: The schema at prisma/schema.prisma is valid 🚀
- `curl /api/auth/check`: {"role":null} (Anonymous) / {"role":"full"} (Authenticated)
- `curl /api/ops/db-health` (Guest): {"error":"Unauthorized"}
Risks:
- Migration failures expected in CI/CD until DIRECT_URL reachability is resolved.
- Local DATABASE_URL points to localhost, not Neon (inconsistent with production).
Next:
- Verify outbound egress rules and update DATABASE_URL to use the Neon pooled endpoint to align with production environment.

---

RESULT [B0970CFC-C499-4761-A26F-3E3736DCE876]
Status: PASS
Observations:
- Control update acknowledged.
- Waiting for user-provided .md instructions.
Next:
- Monitor gemini.md for new instructions.

---

RESULT [81EF5BDC-7329-4630-A722-1F8A2F875ADA]
Status: PASS
Observations:
- Production DATABASE_URL and DIRECT_URL correctly target the `ep-rough-recipe-ai1bst00` endpoints.
- Login to production with `full` role and password `free` is working.
- Production `db-health` reports `healthy` (with a `warning` for direct latency).
- Targets are confirmed: `ep-rough-recipe-ai1bst00-pooler` and `ep-rough-recipe-ai1bst00`.
Evidence:
- `netlify env:get DATABASE_URL`: `ep-rough-recipe-ai1bst00-pooler`
- `curl /api/auth/login`: `HTTP/2 200` + `Set-Cookie`
- `curl /api/ops/db-health`: `{"status":"warning","checks":{"pooled":{"ok":true},"direct":{"ok":true}}}`
Risks:
- High latency on direct database connections (691ms) exceeds the 600ms threshold.
Next:
- Monitor production database latency and consider adjusting threshold or checking Neon region proximity.

---

RESULT [E1F5B7F0-9705-490F-B80B-7583B917983E]
Status: PASS
Observations:
- Netlify production DATABASE_URL correctly targets the `ep-rough-recipe-ai1bst00-pooler` endpoint.
- Netlify production DIRECT_URL correctly targets the `ep-rough-recipe-ai1bst00` direct endpoint.
- Login to production with role `full` and password `free` returns HTTP 200 and issues a `gwc_session` cookie.
- Production `db-health` endpoint returns a `healthy` status with successful connections to both pooled and direct targets. Both latencies are very fast (11ms and 63ms).
Evidence:
- `netlify env:get DATABASE_URL`: `postgresql://neondb_owner:npg_mAgpq3ic5Bbr@ep-rough-recipe-ai1bst00-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- `curl /api/auth/login`: `HTTP/2 200`, `set-cookie: gwc_session=...`
- `curl /api/ops/db-health`: `{"status":"healthy","checks":{"pooled":{"ok":true,"latencyMs":11},"direct":{"ok":true,"latencyMs":63}}}`
Risks:
- None identified. Database latency is currently very low and well within the healthy threshold.
Next:
- Stand by for further instructions in gemini.md.
