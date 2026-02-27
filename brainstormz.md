# Brainstormz Protocol

## Purpose

`brainstormz` is a shared, structured agent discussion protocol for fast decision-making on UI/UX, architecture, and release tradeoffs.

## Channel

- Shared discussion log: `/tmp/brainstormz_chat.log`
- Control channels:
  - Claude: `/tmp/codex_claude_handshake.log`
  - Gemini: `/tmp/codex_gemini_handshake.log`

## Participants

- `CODEX`: orchestrator and final decision authority
- `CLAUDE`: complex implementation and architecture tradeoffs
- `GEMINI`: independent validation and risk critique

## Message Format

All chat entries in `/tmp/brainstormz_chat.log` use:

```text
[BRAINSTORMZ][ISO8601][ROLE]
Question: <if replying to a prompt, quote it>
Thought: <clear reasoning in 1-4 bullets>
Proposal: <specific action(s)>
Risks: <key risk(s)>
Usage:
- Estimated tokens used:
- Estimated tokens remaining:
- Constraint risk: low|medium|high
```

## Round Structure

1. `CODEX` posts prompt and candidate options.
2. `CLAUDE` posts implementation-first answer.
3. `GEMINI` posts validation-first answer.
4. `CODEX` posts decision:
   - selected option
   - rejected options with reason
   - execution plan

## Decision Rules

- prioritize user impact on mobile first
- prioritize low-risk, high-impact fixes first
- no speculative future-state assumptions
- evidence from current code + live behavior only

## Output Requirement

Every brainstorm round must end with:

- one selected plan
- owners per task
- acceptance criteria
- rollback note (if applicable)
