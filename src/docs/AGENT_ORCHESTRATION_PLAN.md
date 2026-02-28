# Agent Orchestration Plan

Last updated: 2026-02-28
Owner: Codex (Primary Orchestrator)

## Canonical Source

This file is now a high-level pointer. Canonical IACP details live in:
- `src/docs/iacp/README.md`
- `src/docs/iacp/ROLE_MATRIX.md`
- `src/docs/iacp/PROTOCOL.md`
- `src/docs/iacp/TEMPLATES.md`
- `src/docs/iacp/GATES.md`

## Current Operating Truth

- Codex is primary orchestrator (active).
- Claude is standby implementation architect, activated by Codex dispatch.
- Gemini is active independent verifier.
- Status integrity is strict: contradictions invalidate PASS.

## Execution Model

1. Codex dispatches bounded UUID task.
2. Assigned agent executes within scope.
3. Results are validated against IACP gates.
4. Codex decides acceptance and next dispatch.
