# Technology Context

Last updated: 2026-02-27

## 1) Core Stack

### Runtime and framework

- Next.js 16 (App Router)
- React 19
- TypeScript 5.9

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

- candidate staging tables separate restoration data from production logs
- explicit provenance hash generation and commit-time verification
- role-gated commit path (`SUPERVISOR`/`CLINICAL_LEAD`)
- approval governance in `approveAll` including segregation of duties
- append-only style audit events with previous-hash linkage

## 4) Current Constraints and Tradeoffs

### Testing

- automated tests are not yet wired into `npm test`
- quality gate is currently build + Prisma checks + runtime smoke tests

### Auth architecture

- signed-session auth is active via middleware (`full` and `guest` roles)
- login uses `SITE_PASSWORD`; production hardening depends on strong `SESSION_SECRET`
- commit and approval routes still apply DB role checks for governance-critical actions

### Generation model maturity

- realism model includes day-level coherence and phrase variation
- participant-specific personalization from historical data is still pending

## 5) Near-Term Technical Priorities

1. Wire a real API test harness (Vitest or Jest) with DB fixtures.
2. Upgrade auth from shared password to per-user identity mapping with `Staff`.
3. Introduce personalization loop for participant baseline behavior.
