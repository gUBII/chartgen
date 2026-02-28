# IACP v3 - Agent Protocol Pack

Last updated: 2026-03-01
Owner: Codex (Program Director + Release Governor)

## Purpose

Single source of truth for multi-agent execution, verification, and frugal release control.

## Canonical Policy

- Local-first, deploy-last is always the default.
- Deploy requires explicit `DEPLOY_APPROVED` plus full gate pass.
- Channel paths are canonical and non-duplicated.
- Operator/Codex can trigger dispatch; agents execute in parallel by file ownership.

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

- Claude: `/tmp/codex_claude_handshake.log`
- Gemini: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

No dual-channel mirroring for canonical truth.

## Hard Rules

- Every response starts with role/name.
- One UUID maps to one bounded objective.
- No placeholder results.
- `PASS` is forbidden when any contradiction signal exists.
