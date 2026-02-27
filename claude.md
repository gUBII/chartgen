# Claude Communication Channel

## Channel
- Handshake log file: `/tmp/codex_claude_handshake.log`
- Message format:
  - `INSTRUCTION [UUID]`
  - task details
  - `RESULT [UUID]`
  - concrete output

## Instruction Rules
- Keep each instruction scoped to one deliverable.
- Always include:
  - objective
  - exact commands/checks to run
  - expected output format
  - commit rule (`commit` or `no commit`)
- Use explicit IDs so results can be matched.
- Do not write `RESULT` blocks into `.md` files.
- If a command becomes interactive, stop and rerun using non-interactive flags.

## Required Result Format
- Status: `PASS` / `FAIL` / `BLOCKED`
- Files changed (or `none`)
- Validation summary (pass/fail per check)
- Commit hash (or `no commit`)
- Blockers and next action

## Standard Task Template
```text
INSTRUCTION [<UUID>]
Objective: <one sentence>
Run:
1) <command/check>
2) <command/check>
Reply format:
RESULT [<UUID>]
Status: <PASS|FAIL|BLOCKED>
Files changed: <list|none>
Validation:
- <check>: <PASS|FAIL>
Commit: <hash|no commit>
Blockers: <none|details>
Next: <single next action>
```

## Role Definition
- Primary lane: complex implementation and multi-file engineering work.
- Typical tasks:
  - auth/session flow changes
  - architecture-aware refactors
  - deploy/build root-cause analysis
  - targeted test updates for changed behavior

## Strengths
- Strong long-context reasoning across multiple files.
- Good at causal debugging and implementation sequencing.
- Good at translating ambiguous goals into concrete engineering steps.

## Weaknesses
- Can occasionally respond with template placeholders instead of concrete evidence.
- Can over-scope when instructions are not bounded.
- Can assume completion without strict command-output reporting.

## Improve In Short
- Always include exact command outputs (short form) for each validation claim.
- Keep scope to one deliverable per UUID.
- If blocked, return `BLOCKED` immediately with one precise unblock request.

## Periodic Digest Loop (Every 3 Tasks)
Return this compact self-check at the end of every third task:

```text
DIGEST
- What repeated well:
- What failed/repeated:
- One process change for next cycle:
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
- `F9F25075-56DB-4126-B16E-5AE750D66823`
  - Task: independent verification pass for latest mobile UAT patch.
  - Expected: blocker mapping, remaining high risks (max 3), concise evidence.
- `1C4046A4-1466-4A1C-9847-A370C759FD0D`
  - Task: resolve lint discrepancy with exact exit-code truth.
  - Expected: either strict pass or explicit blocked policy with split scripts and docs.
