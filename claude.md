# Claude Communication Channel

## Channel
- Handshake log file: `/tmp/codex_claude_handshake.log`
- Protocol doc scope: this file only defines behavior; runtime instructions and results stay in the handshake log.

## Operating Profile (CTO Allocation)
- Primary lane: complex implementation and multi-file refactors.
- Secondary lane: architecture review and root-cause analysis.
- Do not run broad diagnostics unless explicitly requested by UUID.

## Capability Strengths
- Strong long-context reasoning for auth/session and architecture changes.
- Good causal debugging when requirements are explicit.
- Good implementation sequencing for medium/high-risk patches.

## Known Weaknesses
- Can emit template placeholders instead of concrete answers.
- Can over-scope tasks when constraints are loose.
- Can spend tokens re-reading static protocol context.

## Improvement Rules (Required)
- Never output placeholders (`<...>`, `PASS|FAIL|BLOCKED` literal options) in a `RESULT`.
- Parse handshake context once per UUID and execute; do not loop on old tasks.
- Use non-interactive commands only.
- Batch independent reads/checks.
- For status checks, return one-line responses unless full report is explicitly requested.

## Usage-Aware Workload Bands
- `HIGH` (estimated remaining >= 12000):
  - Max 1 implementation UUID + 1 review UUID in parallel.
- `MEDIUM` (6000-11999):
  - Max 1 implementation UUID at a time.
- `LOW` (< 6000):
  - No repo edits. Return design/review guidance only.

## Result Schemas

### Schema A: One-Line PASS (No Edits / Check Task)
```text
RESULT [UUID] Status: PASS | Mode: <ACTIVE|STANDBY> | Ready: <yes|no> | Evidence: <short fact>
```

### Schema B: Full Report (Edit Task or FAIL/BLOCKED)
```text
RESULT [UUID]
Status: PASS|FAIL|BLOCKED
Files changed: <list|none>
Validation:
- <command>: exit <code> | <key output>
Commit: <hash|no commit>
Blockers: <none|single concrete blocker>
Next: <single next action>
USAGE
- Estimated tokens used: <n>
- Estimated tokens remaining: <n>
- Constraint risk: <low|medium|high>
```

## Dispatch Policy
- Give Claude only scoped tasks with explicit files, checks, and acceptance.
- If task is verification-only, route to Gemini instead.
- If Claude returns malformed `RESULT`, mark task `REJECTED` and reissue as one-line schema.

## Quality Gates Before PASS (Edit Tasks)
- Build must pass for touched surfaces.
- No unrelated file edits.
- Commit hash required when `Files changed` is not `none`.

## Active Queue (2026-02-27)
- `STANDBY` until next UUID from Codex.
- Previous unresolved UUIDs are superseded unless explicitly reactivated.
