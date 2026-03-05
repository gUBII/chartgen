# IACP Role Matrix (v3)

Last updated: 2026-03-05

## Canonical Role Identifiers

- `ROLE_RELEASE_GOVERNOR`
  - Role: `PROGRAM_DIRECTOR + RELEASE_GOVERNOR`
  - State: `ACTIVE`
  - Owns: backlog truth, merge gates, release go/no-go
  - Owns: deploy budget enforcement and batch release decisions

- `ROLE_IMPLEMENTATION_LEAD`
  - Role: `PRINCIPAL_BUILDER_COMPLEX_SYSTEMS`
  - State: `ON_DISPATCH`
  - Owns when active: complex implementation, multi-file refactors, root-cause lanes
  - Constraint: no deploy execution unless dispatch includes `DEPLOY_APPROVED`

- `ROLE_INDEPENDENT_VERIFIER`
  - Role: `INDEPENDENT_QA_VERIFIER + DOCS_DIAGRAM_LEAD`
  - State: `ON_DISPATCH`
  - Owns: independent verification, contradiction detection, docs/diagram coherence
  - Constraint: no autonomous deploy triggering

## Runtime Assignment Rule

- Runtime model names are aliases only.
- Any logged-in agent may assume any role identifier.
- Assignment is explicit per dispatch and scoped to a UUID/objective.

## Lane Model

- Lane A (Build): `ROLE_RELEASE_GOVERNOR` + `ROLE_IMPLEMENTATION_LEAD` on explicit file ownership.
- Lane B (Verify): `ROLE_INDEPENDENT_VERIFIER` independent PASS/FAIL evidence and docs coherence.
- Lanes run in parallel when file ownership does not overlap.

## Dispatch Direction (Non-Blocking)

- Operator or `ROLE_RELEASE_GOVERNOR` can trigger dispatches.
- `ROLE_IMPLEMENTATION_LEAD` and `ROLE_INDEPENDENT_VERIFIER` execute in parallel by explicit file ownership.
- Execution lanes return results to `ROLE_RELEASE_GOVERNOR` for release decision only.
- No agent waits on an orchestrator tick when ownership is clear.

## Conflict Authority

When outputs conflict, `ROLE_RELEASE_GOVERNOR` resolves release truth using gate evidence.
