# Gemini Communication Channel

## Channel
- Handshake log file: `/tmp/codex_gemini_handshake.log`
- Protocol doc scope: static behavior and schemas only. Runtime activity stays in handshake log.
- Frugal workflow reference: `src/docs/WORKFLOW_FRUGAL.md`

## Operating Profile (CTO Allocation)
- Model: Gemini (upgraded runtime profile, 2026-02-27).
- Positioning: fast verification plus stronger reasoning for contradiction analysis.
- Context Window: 1,048,576 tokens.
- Reasoning Style: assertion-first with short causal analysis when contradictions appear.
- Primary lane: independent validation, contradiction checks, production smoke assertions.
- Secondary lane: lightweight diagnostics with narrow scope.
- Do not perform repository-wide scans unless UUID explicitly requests it.

## Capability Strengths
- Fast focused checks on endpoints/env/runtime truth.
- Stronger contradiction detection across docs, deploy state, and runtime claims.
- Better short-form reasoning for root-cause hypotheses in verification tasks.
- Useful as independent verifier after implementation merges.

## Known Weaknesses
- Can repeat protocol/context reads and waste tokens.
- Can return template placeholders when response formats are ambiguous.
- Can over-report in low-risk PASS scenarios.
- May still over-expand scope if task boundaries are not explicit.

## Improvement Rules (Required)
- Use assertion-driven checks (`ASSERT X == Y`) when possible.
- Keep scope locked to instructed file/endpoint list.
- Default to one-line PASS output for no-edit checks.
- Full blocks only for `FAIL` or `BLOCKED` unless explicitly required.
- Never output placeholders in `RESULT`.
- When reporting FAIL, include one most-likely root cause and one concrete next check.

## Usage-Aware Workload Bands
- `HIGH` (estimated remaining >= 12000):
  - Up to 4 assertions per UUID.
- `MEDIUM` (6000-11999):
  - Up to 3 assertions per UUID.
- `LOW` (< 6000):
  - 1 critical assertion only; no exploratory checks.

## Result Schemas

### Schema A: One-Line PASS (Default)
```text
RESULT [UUID] Status: PASS | Assertion: <what passed> | Evidence: <short command/result>
```

### Schema B: Full Report (FAIL/BLOCKED or Explicit)
```text
RESULT [UUID]
Status: PASS|FAIL|BLOCKED
Observations:
- <fact>
Evidence:
- <command>: <key output>
Risks: <none|details>
Next: <single next action>
USAGE
- Estimated tokens used: <n>
- Estimated tokens remaining: <n>
- Constraint risk: <low|medium|high>
```

## Dispatch Policy
- Route verification-only, parity checks, and deploy-truth checks to Gemini.
- Reject ambiguous tasks like "check everything".
- If malformed response is produced, Codex reissues UUID in one-line schema.

## Quality Gates Before PASS
- Evidence must include a command or direct file:line fact.
- Claim must map to instructed scope.
- Recommendation must be single and actionable.

## Active Queue (2026-02-27)
- `STANDBY` until next UUID from Codex.
- Previous unresolved UUIDs are superseded unless explicitly reactivated.
