# Agent Handshake Channel Map

Last updated: 2026-03-01

## Canonical Channels

- Claude: `/tmp/codex_claude_handshake.log`
- Gemini: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

## Why

Some agent runtimes cannot read `/tmp`. Gemini dispatch/result traffic is therefore routed to a workspace-local file.

## Operational Rule

- Dispatch Gemini tasks to `handoff/gemini_handshake.md`.
- Treat canonical path results as source of truth for acceptance.
- Do not create secondary mirrors unless explicitly required for incident recovery.
