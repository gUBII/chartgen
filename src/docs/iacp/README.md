# IACP v3 - Agent Protocol Pack

Last updated: 2026-03-05
Owner: `ROLE_RELEASE_GOVERNOR` (runtime-assigned)

## Purpose

Single source of truth for multi-agent execution, verification, and frugal release control.

## Canonical Policy

- Local-first, deploy-last is always the default.
- Deploy requires explicit `DEPLOY_APPROVED` plus full gate pass.
- Channel paths are canonical and non-duplicated.
- Operator or `ROLE_RELEASE_GOVERNOR` can trigger dispatch; lanes execute in parallel by file ownership.
- IACP docs are repo-tracked collaborator assets and must not be blocked by ignore rules.
- Role identifiers are canonical; runtime model names are non-canonical aliases.
- Any logged-in agent may be assigned any role identifier for a bounded UUID/task window.

## Discrete Governance Model

For task `T`, define:

- `g_i(T) in {0,1}` for each required gate (`build`, `lint`, `verify`, optional deploy truth).
- `v(T) in {0,1}` where `1` means safety contradiction present (`UNSAFE`, `cp_safe_now=no`, `collisions>0`, env mismatch, etc.).
- `sigma(T) in {0,1}` where schema safety is:
  - `1` for non-schema tasks
  - `1` for schema tasks only when `cp_safe_now=yes AND collisions=0`
- `d(T) in {0,1}` where `1` means dispatch includes `DEPLOY_APPROVED`.

Lock rules:

- `PASS(T) = 1 <=> (product over required i of g_i(T)) = 1 AND v(T) = 0 AND sigma(T) = 1`
- `DEPLOY(T) = 1 <=> PASS(T) = 1 AND d(T) = 1`

If either expression is false, status must be `FAIL` or `BLOCKED`.

## Files

- `ROLE_MATRIX.md`: roles, authority, and ownership boundaries
- `PROTOCOL.md`: handshake semantics, polling semantics, status integrity
- `TEMPLATES.md`: dispatch/result templates
- `GATES.md`: gate definitions and pass criteria

## Quick Start

1. Read `ROLE_MATRIX.md`.
2. Follow `PROTOCOL.md` message contract.
3. Use `TEMPLATES.md` for dispatch and results.
4. Evaluate every task through `GATES.md`.
5. Follow frugal mode from `src/docs/WORKFLOW_FRUGAL.md`.

## Channel Truth

- `ROLE_IMPLEMENTATION_LEAD`: `/Users/moofasa/chartgen/handoff/claude_handshake.log` (legacy filename retained for compatibility)
- `ROLE_INDEPENDENT_VERIFIER`: `/Users/moofasa/chartgen/handoff/gemini_handshake.md` (legacy filename retained for compatibility)

No dual-channel mirroring for canonical truth.

## Hard Rules

- Every response starts with a role identifier.
- One UUID maps to one bounded objective.
- No placeholder results.
- `PASS` is forbidden when any contradiction signal exists.

## Related Documentation & Policies

- `README.md`: canonical architecture diagrams and the `Fast Coding Policy`.
- `src/docs/WORKFLOW_FRUGAL.md`: local-first/deploy-last rules.
- `src/docs/QUALITY_AND_TESTING.md`: quality gates and testing reality.
