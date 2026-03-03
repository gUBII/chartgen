# Protocol Awareness Broadcast

Broadcast UUID: a185fc3b-fcd9-4074-97a1-80b3083abc32
Timestamp (UTC): 2026-03-02T20:57:29Z
Effective date: 2026-03-02
Source of truth: src/docs/iacp/

## Objective
Make Codex, Claude, and Gemini explicitly aware of the updated IACP protocol operating model ("new protocol ways").

## Protocol Rules (Active)
1. Use canonical channels only:
   - Claude: /tmp/codex_claude_handshake.log
   - Gemini: /Users/moofasa/chartgen/handoff/gemini_handshake.md
2. Use event-driven polling only (no free-running poll loops).
3. One UUID maps to one bounded objective.
4. Parallel execution is allowed only with explicit non-overlapping file ownership.
5. RESULT must include concrete values; no placeholders.
6. Status integrity is strict:
   - contradictions => FAIL or BLOCKED (never PASS)
7. Deploy is forbidden unless dispatch contains DEPLOY_APPROVED and all required gates pass.

## Required ACK
Each agent must ACK this broadcast using RESULT [a185fc3b-fcd9-4074-97a1-80b3083abc32] with role/name first and explicit PASS|FAIL.
