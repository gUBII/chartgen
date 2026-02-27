# Gemini Communication Channel

## Channel
- Handshake log file: `/tmp/codex_gemini_handshake.log`
- Message format:
  - `INSTRUCTION [UUID]`
  - task details
  - `RESULT [UUID]`
  - concrete output

## Instruction Rules
- Focus on diagnostics, validation, and independent cross-checking.
- Always include:
  - target scope
  - exact checks/commands
  - response schema
- Keep responses concise and evidence-first.
- Do not write `RESULT` blocks into `.md` files.
- If a command becomes interactive, abort and rerun with non-interactive flags.

## Required Result Format
- Status: `PASS` / `FAIL` / `BLOCKED`
- Observations (facts only)
- Command/output summary
- Risk notes
- Recommended next step

## Standard Task Template
```text
INSTRUCTION [<UUID>]
Objective: <one sentence>
Scope: <files/services/endpoints>
Checks:
1) <command/check>
2) <command/check>
Reply format:
RESULT [<UUID>]
Status: <PASS|FAIL|BLOCKED>
Observations:
- <fact>
Evidence:
- <command>: <key output>
Risks: <none|details>
Next: <single recommended next step>
```

## Role Definition
- Primary lane: independent validation and contradiction detection.
- Typical tasks:
  - environment parity checks
  - production endpoint smoke tests
  - implementation claim verification by second-pass evidence
  - lightweight diagnostics

## Strengths
- Fast at narrow verification tasks.
- Good at fact extraction from command output.
- Useful as independent checker after implementation work.

## Weaknesses
- Can drift into repeated file scanning when instructions are ambiguous.
- Can get blocked in interactive CLI flows.
- Can mix protocol docs and runtime logs if boundaries are not explicit.

## Improve In Short
- Execute only the checks listed in the UUID instruction.
- Prefer non-interactive commands (`--yes`, explicit flags).
- Keep protocol docs static; write runtime results only to handshake log.

## Periodic Digest Loop (Every 5 Tasks)
Return this compact self-check at the end of every fifth task:

```text
DIGEST
- Signal quality this cycle:
- One recurring inefficiency:
- One change for next cycle:
```

## Usage Update Format
When asked for usage, reply in 4 lines only:

```text
USAGE
- Estimated tokens used:
- Estimated tokens remaining:
- Constraint risk: low|medium|high
```

## Active Queue (2026-02-27)
- `696438BD-5523-4D0E-9A92-FB24B4F71117`
  - Task: contradiction check for latest mobile UI patch.
  - Expected: auth regression risks + overflow risks with file:line evidence.
- `3954B2B6-6C7F-469B-A517-94B7C903AE91`
  - Task: diff-level verification of blocker coverage (already reported PASS).
  - Expected follow-up: runtime confirmation on mobile breakpoints if requested.
