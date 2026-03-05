# IACP Protocol Semantics (v3)

## Canonical Handshake Channels

- `ROLE_IMPLEMENTATION_LEAD`: `/Users/moofasa/chartgen/handoff/claude_handshake.log` (legacy filename retained for compatibility)
- `ROLE_INDEPENDENT_VERIFIER`: `/Users/moofasa/chartgen/handoff/gemini_handshake.md` (legacy filename retained for compatibility)

Only these paths are canonical.

## Message Contract

- Instruction header: `INSTRUCTION [UUID]`
- Result header: `RESULT [UUID]`
- Every response must start with a role identifier.

## Polling Semantics

Use discrete poll gating:

- `p = event_change OR timer_tick`
- If `p = 0`, do not poll.
- If `p = 1`, poll once and return to work/standby.

No free-running poll loops.

## Dispatch Semantics

- One UUID = one bounded objective.
- File ownership must be explicit for parallel lanes.
- Operator-triggered dispatch is valid.
- `ROLE_RELEASE_GOVERNOR` does not block execution lanes; it governs release truth.
- Default scope is `NO_DEPLOY`.
- Deploy is legal only when instruction includes `DEPLOY_APPROVED`.

## Mandatory Result Fields (edit tasks)

- `Status: PASS|FAIL|BLOCKED`
- `Files changed: <list|none>`
- `Validation: <command>: exit <code> | <summary>`
- `Commit: <hash|no commit>`
- `Blockers: <none|single concrete blocker>`
- `Next: <single next action>`

## Environment Truth Rule

- Local checks use `.env`.
- Production parity checks use `.env.production.local` and Netlify truth.
- Any production claim with localhost DB values is invalid and must be `FAIL` or `BLOCKED`.

## Discrete Status Integrity

For task `T`:

- `PASS(T) = 1 <=> (all required gates pass) AND (no safety contradiction) AND (schema safe when applicable)`
- Contradiction examples:
  - `append_as_is=UNSAFE`
  - `cp_safe_now=no`
  - `CollisionCount > 0`
  - prod/local env mismatch

If contradiction exists, `Status` cannot be `PASS`.

## Non-Negotiables

- No placeholder values in final results.
- No interactive command flows in agent tasks.
- No autonomous production deploy calls by non-governor roles.
