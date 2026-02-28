# IACP Role Matrix

Last updated: 2026-02-28

## Active Roles

- Codex
  - Role: `PRIMARY ORCHESTRATOR`
  - State: `ACTIVE`
  - Owns: sequencing, dispatch, acceptance, merge/deploy readiness

- Claude
  - Role: `IMPLEMENTATION ARCHITECT`
  - State: `STANDBY` (reactivates when dispatched)
  - Owns when active: complex implementation, architecture refactors, deep root-cause lanes

- Gemini
  - Role: `INDEPENDENT VERIFIER`
  - State: `ACTIVE`
  - Owns: verification checks, contradiction detection, independent PASS/FAIL evidence

## Dispatch Direction

- Codex -> Claude: complex implementation tasks
- Codex -> Gemini: verification and contradiction checks
- Claude/Gemini -> Codex: results only; no autonomous orchestration

## Authority Boundary

- Only Codex can finalize status truth when agent outputs conflict.
