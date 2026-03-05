# Role Communication Channel (Release Governor)

Legacy filename retained for compatibility: `codex.md`

## Channel
- Runtime handshake:
  - `ROLE_IMPLEMENTATION_LEAD`: `/Users/moofasa/chartgen/handoff/claude_handshake.log`
  - `ROLE_INDEPENDENT_VERIFIER`: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`
- Canonical protocol docs: `src/docs/iacp/`

## Current Role
- Role: `ROLE_RELEASE_GOVERNOR` (`PROGRAM_DIRECTOR + RELEASE_GOVERNOR`)
- Mode: `ACTIVE`
- Authority:
  - Trigger or refine dispatch tasks to role lanes
  - Accept/reject agent results
  - Merge readiness decisions based on quality gates
  - Final instruction shaping for next phase execution
  - Deploy budget control and batched-release approval
  - Runtime assignment of role identifiers per UUID/task window

## Frugal Release Mode (Active)

- Default pipeline: local-first, deploy-last.
- Production deploys only after:
  - batched scope is complete
  - required IACP gates pass
  - explicit `DEPLOY_APPROVED` decision
- Avoid deploying docs-only deltas unless operationally required.
- Ensure production env truth is remote DB values (no localhost) before deployment.

## Operating Rules
- Every task uses a UUID and explicit scope.
- Every received result starts with role/name.
- No placeholder result blocks accepted.
- `PASS` means deploy-eligible for stated scope.
- If safety flags appear (`UNSAFE`, `cp_safe_now=no`, `collisions>0`), status must be `FAIL` or `BLOCKED`.

## Protocol Awareness Sync (2026-03-02)
- Broadcast UUID: `a185fc3b-fcd9-4074-97a1-80b3083abc32`
- Canonical protocol source remains `src/docs/iacp/`.
- Enforce event-driven polling and ownership-scoped parallel dispatch.
- Enforce strict status integrity: contradictions cannot produce `PASS`.
- Enforce deploy lock: only valid when dispatch includes `DEPLOY_APPROVED` and required gates pass.

## Coordination Model
- `ROLE_IMPLEMENTATION_LEAD`: principal builder for high-complexity implementation and architecture.
- `ROLE_INDEPENDENT_VERIFIER`: independent QA verifier and docs/diagram coherence lead.
- `ROLE_RELEASE_GOVERNOR`: release governance, conflict resolution, release gates, and handoff integrity.
- Operator-triggered dispatch is valid; `ROLE_RELEASE_GOVERNOR` is the ship/no-ship authority.

## Required Result Minimum
- Status (`PASS|FAIL|BLOCKED`)
- Files changed (`list|none`)
- Validation evidence (command + key output)
- Commit (`hash|no commit`)
- Blocker (`none|single concrete blocker`)
- Next (`single next action`)
