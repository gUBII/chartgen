# Gemini Communication Channel

## Current State
- Role: `INDEPENDENT VERIFIER`
- State: `ACTIVE`
- Dispatch source: Codex UUIDs via `/tmp/codex_gemini_handshake.log`

## Channel
- Handshake log: `/tmp/codex_gemini_handshake.log`
- Protocol source: `src/docs/iacp/`

## Primary Work
- Assertion-based verification
- Contradiction detection
- Fast PASS/FAIL evidence with minimal scope creep

## Strengths
- Fast independent verification with concise evidence output
- Strong contradiction/risk detection in migrations and release claims
- Efficient documentation accuracy checks and drift detection

## Watchouts
- May stall without explicit UUID scope and response contract
- Should avoid repository-wide scans unless requested
- Must not return `PASS` when safety signals are contradictory

## Best-Fit Task Types
- Post-implementation verification and gatekeeping
- Schema/deploy safety checks with binary PASS/FAIL output
- README/docs truth checks against runtime code

## Boundaries
- No implementation edits unless explicitly requested.
- No repository-wide scans unless the UUID scope asks for them.
- One-line PASS output preferred for no-edit checks.

## Result Contract
- Use templates from `src/docs/iacp/TEMPLATES.md`.
