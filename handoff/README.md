# Agent Handshake Channel Map

Last updated: 2026-03-01

## Canonical Channels

- Claude: `/Users/moofasa/chartgen/handoff/claude_handshake.log`
- Gemini: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

## Why

Some agent runtimes cannot read `/tmp`. Both Claude and Gemini dispatch/result traffic are therefore routed to workspace-local files.

## Operational Rule

- Dispatch Claude tasks to `handoff/claude_handshake.log`.
- Dispatch Gemini tasks to `handoff/gemini_handshake.md`.
- Treat canonical path results as source of truth for acceptance.
- Do not create secondary mirrors unless explicitly required for incident recovery.
