# Code Cleaning Day - Execution Plan

Last updated: 2026-03-01
Owner: Codex
Mode: local-first, no deploy

## Objective

Remove deprecated, redundant, and low-signal code/docs safely without introducing regressions.

## Scope

- Protocol/docs cleanup (deprecated channel references, stale role names, redundant policy text).
- Source cleanup in active UI routes and restoration/audit flows (remove dead branches and redundant wording).
- Verification and drift checks before merge.

## Ownership Model

- Codex: dispatch, scope control, final merge gate.
- Claude: heavy implementation cleanup in `src/`.
- Gemini: independent verification + docs/diagram coherence.

## Execution Phases

### Phase A - Canonical Docs Cleanup

- Remove legacy handshake mirror references from canonical docs.
- Normalize role names and IACP terminology to v3.
- Keep a single source of truth for channels and deploy rules.

Exit criteria:

- No canonical docs reference `/tmp/codex_gemini_handshake.log`.
- IACP docs all reference v3 roles and formulas.

### Phase B - Source Cleanup

- Remove deprecated code paths and redundant UX copy.
- Keep behavior unchanged unless bug fix is explicitly in scope.
- Preserve accessibility and auth boundaries.

Exit criteria:

- `npm run lint:report` has no new errors.
- `npm run build -- --webpack` passes.

### Phase C - Independent Verification

- Verify cleaned code paths still satisfy route and API expectations.
- Validate no accidental removal of required UI or API behavior.

Exit criteria:

- Gemini PASS with evidence for affected routes/APIs.
- Codex review PASS.

## Task Buckets

1. Docs cleanup:
   - `README.md`
   - `src/docs/README.md`
   - `src/docs/OPERATIONS_RUNBOOK.md`
   - `src/docs/iacp/*`
   - `handoff/README.md`
2. Source cleanup:
   - route/page wording trim
   - dead condition and obsolete helper cleanup
   - unused style utilities where safe
3. Verification:
   - route smoke checks
   - API contract checks
   - no-new-error lint/build evidence

## Hard Constraints

- No deploy in this phase.
- No unrelated feature additions.
- One bounded commit per cleanup bundle.
