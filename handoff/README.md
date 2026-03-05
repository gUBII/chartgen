# Agent Handshake Channel Map

Last updated: 2026-03-05

## Canonical Channels

- `ROLE_IMPLEMENTATION_LEAD`: `/Users/moofasa/chartgen/handoff/claude_handshake.log` (legacy filename retained for compatibility)
- `ROLE_INDEPENDENT_VERIFIER`: `/Users/moofasa/chartgen/handoff/gemini_handshake.md` (legacy filename retained for compatibility)

## Why

Some agent runtimes cannot read `/tmp`. Dispatch/result traffic is therefore routed to workspace-local files.

## Operational Rule

- Dispatch `ROLE_IMPLEMENTATION_LEAD` tasks to `handoff/claude_handshake.log`.
- Dispatch `ROLE_INDEPENDENT_VERIFIER` tasks to `handoff/gemini_handshake.md`.
- Treat canonical path results as source of truth for acceptance.
- Do not create secondary mirrors unless explicitly required for incident recovery.
