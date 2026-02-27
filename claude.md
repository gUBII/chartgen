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
