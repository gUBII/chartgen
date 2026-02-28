# IACP Role Matrix

Last updated: 2026-03-01

## Active Roles

- Codex
  - Role: `PRIMARY ORCHESTRATOR`
  - State: `ACTIVE`
  - Owns: sequencing, dispatch, acceptance, merge/deploy readiness
  - Owns: deploy budget enforcement and release batching decisions

- Claude
  - Role: `IMPLEMENTATION ARCHITECT`
  - State: `STANDBY` (reactivates when dispatched)
  - Owns when active: complex implementation, architecture refactors, deep root-cause lanes
  - Constraint: no deploy execution unless Codex dispatch includes `DEPLOY_APPROVED`

- Gemini
  - Role: `INDEPENDENT VERIFIER`
  - State: `ACTIVE`
  - Owns: verification checks, contradiction detection, independent PASS/FAIL evidence
  - Constraint: verify deploy necessity/truth; do not trigger deploys autonomously

## Dispatch Direction

- Codex -> Claude: complex implementation tasks
- Codex -> Gemini: verification and contradiction checks
- Claude/Gemini -> Codex: results only; no autonomous orchestration

## Authority Boundary

- Only Codex can finalize status truth when agent outputs conflict.
