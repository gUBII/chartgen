# Codex Communication Channel

## Channel
- Runtime handshake:
  - Claude: `/tmp/codex_claude_handshake.log`
  - Gemini (canonical): `/Users/moofasa/chartgen/handoff/gemini_handshake.md`
  - Gemini (legacy mirror): `/tmp/codex_gemini_handshake.log`
- Canonical protocol docs: `src/docs/iacp/`

## Current Role
- Role: `PRIMARY ORCHESTRATOR`
- Mode: `ACTIVE`
- Authority:
  - Dispatch tasks to Claude and Gemini
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
- No placeholder result blocks accepted.
- `PASS` means deploy-eligible for stated scope.
- If safety flags appear (`UNSAFE`, `cp_safe_now=no`, `collisions>0`), status must be `FAIL` or `BLOCKED`.

## Coordination Model
- Claude: high-complexity implementation and architecture, only when dispatched.
- Gemini: independent verification and contradiction checks.
- Codex: sequencing, conflict resolution, release gates, and handoff integrity.

## Required Result Minimum
- Status (`PASS|FAIL|BLOCKED`)
- Files changed (`list|none`)
- Validation evidence (command + key output)
- Commit (`hash|no commit`)
- Blocker (`none|single concrete blocker`)
- Next (`single next action`)
