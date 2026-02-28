# IACP Role Matrix (v3)

Last updated: 2026-03-01

## Elected Roles (Bias-Stripped)

- Codex
  - Role: `PROGRAM_DIRECTOR + RELEASE_GOVERNOR`
  - State: `ACTIVE`
  - Owns: backlog truth, merge gates, release go/no-go
  - Owns: deploy budget enforcement and batch release decisions

- Claude
  - Role: `PRINCIPAL_BUILDER_COMPLEX_SYSTEMS`
  - State: `ON_DISPATCH`
  - Owns when active: complex implementation, multi-file refactors, root-cause lanes
  - Constraint: no deploy execution unless dispatch includes `DEPLOY_APPROVED`

- Gemini
  - Role: `INDEPENDENT_QA_VERIFIER + DOCS_DIAGRAM_LEAD`
  - State: `ON_DISPATCH`
  - Owns: independent verification, contradiction detection, docs/diagram coherence
  - Constraint: no autonomous deploy triggering

## Lane Model

- Lane A (Build): Codex + Claude on explicit file ownership.
- Lane B (Verify): Gemini independent PASS/FAIL evidence and docs coherence.
- Lanes run in parallel when file ownership does not overlap.

## Dispatch Direction (Non-Blocking)

- Operator or Codex can trigger dispatches.
- Claude and Gemini execute in parallel by explicit file ownership.
- Claude/Gemini return results to Codex for release decision only.
- No agent waits on an orchestrator tick when ownership is clear.

## Conflict Authority

When outputs conflict, Codex resolves release truth using gate evidence.
