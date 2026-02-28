# IACP Dispatch Templates

## Implementation Task (Codex -> Claude)

```text
INSTRUCTION [UUID]
Objective: <one sentence>
Scope files:
- <path>
- <path>
Requirements:
1) <requirement>
2) <requirement>
Validation:
- <command>
- <command>
Constraints:
- no unrelated edits
- non-interactive commands only
Reply:
RESULT [UUID]
Status: PASS|FAIL|BLOCKED
Files changed: <list|none>
Validation:
- <command>: exit <code> | <summary>
Commit: <hash|no commit>
Blockers: <none|single blocker>
Next: <single next step>
```

## Verification Task (Codex -> Gemini)

```text
INSTRUCTION [UUID]
No edits. Verify:
1) <assertion>
2) <assertion>
Reply one line:
RESULT [UUID] PASS|FAIL <k1>=<yes|no> <k2>=<yes|no> risk=<short>
```

## Schema Safety Task

```text
INSTRUCTION [UUID]
No edits.
Run: npm run schema:check:collision
Reply:
RESULT [UUID]
Status: PASS|FAIL|BLOCKED
CpSafeNow: yes|no
CollisionCount: <n>
TopCollisions:
- <model>: <kind>
Rule:
- If CpSafeNow=no or CollisionCount>0 => FAIL/BLOCKED (never PASS)
```
