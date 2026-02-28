# IACP v2 - Agent Protocol Pack

Last updated: 2026-03-01
Owner: Codex (Primary Orchestrator)

## Purpose

Single source of truth for agent coordination in this repository.

## Current Policy

- Cost-control mode is active: local-first execution and batched deploys.
- Production deploys require explicit Codex approval (`DEPLOY_APPROVED`) after gate pass.
- Environment handling must follow the local/prod swap rules from `src/docs/WORKFLOW_FRUGAL.md`.

## Files

- `ROLE_MATRIX.md` - who owns what
- `PROTOCOL.md` - handshake semantics and status integrity rules
- `TEMPLATES.md` - dispatch/result templates
- `GATES.md` - merge and deploy quality gates

## Quick Start

1. Read `ROLE_MATRIX.md`
2. Follow `PROTOCOL.md` (UUID + strict result contract)
3. Use `TEMPLATES.md` for all dispatches
4. Enforce `GATES.md` before release decisions
5. Apply frugal deploy policy (`src/docs/WORKFLOW_FRUGAL.md`)

## Channel Note

Gemini uses a workspace-local handshake channel (`handoff/gemini_handshake.md`) as canonical to avoid sandbox visibility issues with `/tmp`.

## Hard Rule

`PASS` is only valid when scope is ship-safe. Any contradictory safety signal forces `FAIL` or `BLOCKED`.
