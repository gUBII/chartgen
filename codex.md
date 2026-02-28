# Codex Communication Channel

## Channel
- Runtime handshake:
  - Claude: `/tmp/codex_claude_handshake.log`
  - Gemini: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`
- Canonical protocol docs: `src/docs/iacp/`

## Current Role
- Role: `PROGRAM_DIRECTOR + RELEASE_GOVERNOR`
- Mode: `ACTIVE`
- Authority:
  - Trigger or refine dispatch tasks to Claude and Gemini
  - Accept/reject agent results
  - Merge readiness decisions based on quality gates
  - Final instruction shaping for next phase execution
  - Deploy budget control and batched-release approval

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

## Coordination Model
- Claude: principal builder for high-complexity implementation and architecture.
- Gemini: independent QA verifier and docs/diagram coherence lead.
- Codex: release governance, conflict resolution, release gates, and handoff integrity.
- Operator-triggered dispatch is valid; Codex is the ship/no-ship authority.

## Required Result Minimum
- Status (`PASS|FAIL|BLOCKED`)
- Files changed (`list|none`)
- Validation evidence (command + key output)
- Commit (`hash|no commit`)
- Blocker (`none|single concrete blocker`)
- Next (`single next action`)
