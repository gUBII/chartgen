# Frugal Multi-Agent Workflow

Last updated: 2026-02-28
Owner: Codex

Canonical workflow + gates moved to:
- `src/docs/iacp/README.md`
- `src/docs/iacp/PROTOCOL.md`
- `src/docs/iacp/GATES.md`

## Current Summary

- Keep scopes bounded by UUID.
- Default to one-line PASS for no-edit verification tasks.
- Reject placeholder outputs.
- Enforce status integrity (`PASS` only when ship-safe for stated scope).
