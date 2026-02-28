# IACP Protocol Semantics

## Handshake Channels

- Claude channel: `/tmp/codex_claude_handshake.log`
- Gemini channel (canonical): `/Users/moofasa/chartgen/handoff/gemini_handshake.md`
- Gemini legacy mirror: `/tmp/codex_gemini_handshake.log`

## Channel Access Rule

- If an agent runtime cannot read `/tmp`, use a workspace-local handshake file under `handoff/`.
- Codex should mirror critical Gemini dispatches/results to both channels during transition periods.

## Message Structure

- Instruction: `INSTRUCTION [UUID]`
- Result: `RESULT [UUID]`

## Mandatory Result Fields (edit tasks)

- `Status: PASS|FAIL|BLOCKED`
- `Files changed: <list|none>`
- `Validation:` command + key output
- `Commit: <hash|no commit>`
- `Blockers: <none|single concrete blocker>`
- `Next: <single next action>`

## Status Integrity

- `PASS` means deploy-eligible for stated scope.
- `PASS` is invalid if result contains safety contradiction markers, including:
  - `append_as_is=UNSAFE`
  - `cp_safe_now=no`
  - `CollisionCount > 0`
- In those cases, status must be `FAIL` or `BLOCKED`.

## Non-Negotiables

- No placeholder tokens in final results.
- No interactive command flows in agent tasks.
- One UUID = one bounded objective.
