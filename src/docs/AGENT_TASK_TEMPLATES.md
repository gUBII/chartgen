# Agent Task Templates

Last updated: 2026-02-27

Use these templates to keep instructions concise and token-efficient.

## Claude Implementation Template

```text
INSTRUCTION [UUID]
Mode: ACTIVE
Objective: <single sentence>
Scope files:
- <path>
- <path>
Requirements:
1) <concrete requirement>
2) <concrete requirement>
Validation required:
- <command>
- <command>
Constraints:
- no unrelated edits
- no placeholders in RESULT
Reply format:
RESULT [UUID]
Status: PASS|FAIL|BLOCKED
Files changed: <list|none>
Validation:
- <command>: exit <code> | <summary>
- <command>: exit <code> | <summary>
Commit: <hash|no commit>
Blockers: <none|single blocker>
Next: <single next step>
USAGE
- Estimated tokens used: <n>
- Estimated tokens remaining: <n>
- Constraint risk: <low|medium|high>
```

## Gemini Verification Template

```text
INSTRUCTION [UUID]
Mode: ACTIVE
No edits. Verify:
1) <assertion>
2) <assertion>
3) <assertion>
Reply one line only:
RESULT [UUID] PASS|FAIL <k1>=<yes|no> <k2>=<yes|no> <k3>=<yes|no> risk=<short>
```

## Deploy Truth Template

```text
INSTRUCTION [UUID]
Mode: ACTIVE
No edits. Verify latest production deploy for site <site-id>.
Assertions:
1) state is ready
2) commit_ref starts with <commit-prefix>
Reply one line only:
RESULT [UUID] PASS|FAIL deploy_ready=<yes|no> commit_match=<yes|no>
```

## Compliance Recheck Template

```text
INSTRUCTION [UUID]
Mode: ACTIVE
No edits. Run:
1) npm run agent:check:result -- <log-path> <uuid>
Reply one line:
RESULT [UUID] PASS|FAIL compliant=<yes|no>
```
