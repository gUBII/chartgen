# Quality and Testing

Last updated: 2026-02-26

## 1) Current Truth

### Automated tests

- `npm test` is currently a placeholder script in `package.json`.
- There is no active test runner configuration (no Jest/Vitest setup in dependencies/scripts).
- `src/app/api/engine/__tests__/approveAll.test.ts` exists as a draft and is not runnable in current project tooling.

### Practical quality gate in use

Current verification relies on:

1. `npm run build`
2. `npx prisma validate`
3. `npx prisma migrate status`
4. runtime API smoke tests against a running server

## 2) Minimum Smoke Matrix

### Meal workflow

- Generate meal preview
- Approve batch with elevated non-generator reviewer
- Commit batch

### MAR workflow

- Generate MAR preview
- Verify statuses include `ADMINISTERED`, `REFUSED`, and `HELD` across larger sample runs
- Approve batch with elevated non-generator reviewer
- Commit MAR-only batch

### Governance checks

- `approveAll` with `SUPPORT_WORKER` returns `FORBIDDEN_ROLE`
- `approveAll` with generator identity returns `SELF_APPROVAL_FORBIDDEN`

## 3) Recommended Next Step (to make tests real)

1. Choose a runner: Vitest (recommended) or Jest.
2. Add `test` and `test:integration` scripts in `package.json`.
3. Replace draft test placeholders with seeded fixture setup/teardown using Prisma.
4. Avoid dependence on external localhost servers in tests; instantiate route handlers directly or boot isolated test server.
5. Run tests in CI for PR gating.

## 4) Success Criteria for Test Maturity

- `npm test` executes a real suite and exits 0/1 based on assertions.
- Approval governance has deterministic integration tests.
- Commit invariants (hash mismatch, duplicate commit, role checks) have integration coverage.
- Core generation invariants have deterministic unit tests.
