# Agent Handshake Channel Map

Last updated: 2026-02-28

## Canonical Channels

- Claude: `/tmp/codex_claude_handshake.log`
- Gemini: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

## Legacy Mirrors

- Gemini legacy mirror: `/tmp/codex_gemini_handshake.log`
- Claude workspace mirror: `/Users/moofasa/chartgen/handoff/claude_handshake.log`

## Why

Some agent runtimes cannot read `/tmp`. Gemini dispatch/result traffic is therefore routed to a workspace-local file.

## Operational Rule

- Dispatch Gemini tasks to `handoff/gemini_handshake.md`.
- During migration windows, mirror key updates to both Gemini logs.
- Treat canonical path results as source of truth for acceptance.
