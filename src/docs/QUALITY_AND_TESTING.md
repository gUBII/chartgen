# Quality and Testing

Last updated: 2026-03-01

## 1) Current Truth

### Automated tests

- `npm run test:governance` is available and executable.
- It runs end-to-end governance checks against a running API server:
  - `FORBIDDEN_ROLE` enforcement
  - `SELF_APPROVAL_FORBIDDEN` enforcement
  - elevated reviewer success path
  - coverage for both meal and MAR `approveAll`
- `npm test` is still a placeholder script in `package.json`.
- There is still no active Jest/Vitest suite in the project.
- A dedicated `approveAll` test file under `src/app/api/engine/__tests__/` is not present in this repository snapshot.

### Practical quality gate in use

Current verification relies on:

1. `npm run build`
2. `npx prisma validate`
3. `npx prisma migrate status`
4. `npm run test:governance` against a running server
5. runtime API smoke tests for broader flow validation

## 2) Minimum Smoke Matrix

### Meal workflow

- Generate meal preview
- Approve batch with elevated non-generator reviewer
- Commit batch

### Restoration module workflow

- Generate restoration preview and confirm non-empty `sleepLogs`, `bglLogs`, `bowelLogs`
- Confirm `hygieneLogs`, `communityLogs`, and `repositionLogs` are present in preview payload
- Commit grouped payload and verify row counts match API response

### MAR workflow

- Generate MAR preview
- Verify statuses include `ADMINISTERED`, `REFUSED`, and `HELD` across larger sample runs
- Approve batch with elevated non-generator reviewer
- Commit MAR-only batch

### Governance checks

- `approveAll` with `SUPPORT_WORKER` returns `FORBIDDEN_ROLE`
- `approveAll` with generator identity returns `SELF_APPROVAL_FORBIDDEN`

## 3) How to Run Governance Checks

```bash
# terminal 1
npm run dev

# terminal 2
npm run test:governance
```

Environment overrides:

- `API_BASE_URL` (default: `http://localhost:3000`)
- `GOVERNANCE_PARTICIPANT_ID` (default: `112334`)
- `GOVERNANCE_GENERATOR_STAFF_ID` (default: `32213`)

Script path:

- `scripts/test-approval-governance.mjs`

## 4) Recommended Next Step (full test maturity)

1. Adopt Vitest or Jest for isolated route/service tests.
2. Replace draft placeholders with deterministic fixture-based integration tests.
3. Remove external localhost dependency by invoking route handlers in-process.
4. Run tests in CI as required PR gates.

## 5) Success Criteria for Test Maturity

- `npm test` executes a real suite and exits 0/1 based on assertions.
- Approval governance has deterministic integration tests.
- Commit invariants (hash mismatch, duplicate commit, role checks) have integration coverage.
- Core generation invariants have deterministic unit tests.
