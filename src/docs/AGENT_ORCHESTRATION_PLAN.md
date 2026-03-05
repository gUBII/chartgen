# Agent Orchestration Plan

Last updated: 2026-03-05
Owner: `ROLE_RELEASE_GOVERNOR` (runtime-assigned)

## Canonical Source

This file is now a high-level pointer. Canonical IACP details live in:
- `src/docs/iacp/README.md`
- `src/docs/iacp/ROLE_MATRIX.md`
- `src/docs/iacp/PROTOCOL.md`
- `src/docs/iacp/TEMPLATES.md`
- `src/docs/iacp/GATES.md`

## Current Operating Truth

- `ROLE_RELEASE_GOVERNOR` is primary orchestrator (active).
- `ROLE_IMPLEMENTATION_LEAD` is standby implementation architect, activated by governor dispatch.
- `ROLE_INDEPENDENT_VERIFIER` is active independent verifier.
- Runtime model identity is non-canonical; role assignment controls authority.
- Status integrity is strict: contradictions invalidate PASS.
- Frugal release mode is active: local-first, batched deploys, explicit deploy approval only.

## Execution Model

1. `ROLE_RELEASE_GOVERNOR` dispatches bounded UUID task.
2. Assigned agent executes within scope.
3. Results are validated against IACP gates.
4. `ROLE_RELEASE_GOVERNOR` decides acceptance and next dispatch.
