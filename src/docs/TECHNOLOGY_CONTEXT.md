# Technology Context

Last updated: 2026-02-28

## 1) Core Stack

### Runtime and framework

- Next.js 16.1.6
- React 19.2.14
- TypeScript 5.9.3

### Data layer

- PostgreSQL 16
- Prisma 6.17.1

### Styling

- Tailwind CSS v4 + PostCSS

## 2) Why This Stack Fits This Problem

### Strongly typed workflow boundaries

TypeScript + Prisma reduce schema/route drift in an audit-sensitive domain where status fields and hash inputs must remain consistent.

### Transactional integrity

Prisma transactions are used for commit paths to avoid partial writes between candidate rows, ledger rows, and audit events.

### Operational simplicity

Next.js App Router keeps UI and API routes in one codebase, reducing integration complexity for small teams.

## 3) Compliance-Oriented Design Choices in Current Code

- Candidate staging tables separate restoration data from production logs.
- Explicit provenance hash generation and commit-time verification.
- Role-gated commit path (`SUPERVISOR`/`CLINICAL_LEAD`).
- Approval governance in `approveAll` including segregation of duties.
- Append-only style audit events with previous-hash linkage.

## 4) Current Auth Architecture

- **Cookie:** `gwc_session` (primary) with a fallback to `session` for legacy support.
- **Signing:** HMAC signature using a `SESSION_SECRET` environment variable for tamper-proofing.
- **TTL:** Session time-to-live is configurable via `SESSION_TTL_SEC` (defaults to 7 days).
- **Roles:** `full` (staff) and `guest` (site password) are used for access control.
- **Middleware:** `middleware.ts` and `lib/require-full-session.ts` enforce route protection.

## 5) Current Constraints and Tradeoffs

### Testing

- Automated tests are not yet wired into `npm test`.
- The quality gate is currently build + Prisma checks + runtime smoke tests.

### Auth architecture

- While hardened with signed sessions, auth is not yet per-user identity-backed.
- Production security relies on a strong, non-default `SESSION_SECRET`.

### Generation model maturity

- Realism model includes day-level coherence and phrase variation.
- Participant-specific personalization from historical data is still pending.

## 6) Near-Term Technical Priorities

1. Wire a real API test harness (Vitest or Jest) with DB fixtures.
2. Upgrade auth from shared password to per-user identity mapping with `Staff`.
3. Introduce personalization loop for participant baseline behavior.
