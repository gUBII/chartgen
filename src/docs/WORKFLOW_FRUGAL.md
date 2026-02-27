# Frugal Multi-Agent Workflow

Last updated: 2026-02-28
Owner: Codex

## Objective

Deliver fast without wasting tokens by separating implementation, verification, and release authority.

## Roles

- Codex:
  - final task decomposition
  - merge/release authority
  - quality gate enforcement
- Claude:
  - implementation-heavy tasks only
  - one active implementation UUID at a time
- Gemini:
  - verification and contradiction checks
  - no repo-wide scans unless explicitly requested

## Branch Strategy

- `main`:
  - release-only merges
- `claude/<task-id>`:
  - implementation branch
- `codex/integration-<task-id>`:
  - optional integration/hotfix branch before final merge
- Gemini:
  - verification-only by default, no branch unless explicitly editing

## Token Budget Model

- `HIGH` budget:
  - Claude: 1 implementation + 1 narrow follow-up
  - Gemini: up to 4 assertions
- `MEDIUM` budget:
  - Claude: 1 implementation task only
  - Gemini: up to 3 assertions
- `LOW` budget:
  - Claude: no code edits, guidance only
  - Gemini: 1 critical assertion only

## Task Dispatch Rules

1. Every agent task must include:
   - explicit scope files/endpoints
   - exact commands/checks
   - exact reply schema
2. Reject vague prompts such as "check everything."
3. Reject placeholder outputs (`<...>`, option literals).
4. Reissue malformed tasks as one-line schema.

## Acceptance Gates (Required)

1. Repo truth:
   - claimed commit exists
   - claimed files exist
2. Build truth:
   - `npm run build` passes
3. Lint truth:
   - `npm run lint:report` passes
4. Independent verification:
   - Gemini PASS for requested checks
5. Deploy truth:
   - Netlify `state=ready` on expected commit
6. Schema safety truth (schema/migration tasks only):
   - `npm run schema:check:collision` result reviewed
   - overwrite/append-as-is path allowed only when `cp_safe_now=yes collisions=0`

No merge without all required gates.

## Status Integrity Rule

- `PASS` must mean safe-to-ship for the declared scope.
- Any result that includes `UNSAFE`, `CpSafeNow: no`, or `collisions>0` cannot be treated as `PASS`.
- Such outputs must be normalized to `FAIL` or `BLOCKED` before planning continues.

## Minimal Communication Policy

- PASS + no edits:
  - one-line result only
- FAIL/BLOCKED:
  - full block with one blocker and one next step
- No long narratives in handshake logs

## Anti-Waste Practices

- Batch independent checks in one command.
- Reuse existing scripts before writing new ad-hoc scripts.
- Prefer deterministic checks over exploratory commands.
- Stop repeated protocol-file rereads.
- Keep verification lane read-only whenever possible.

## Release Cadence

1. Claude implements.
2. Codex reviews + patches critical issues.
3. Gemini verifies.
4. Codex merges and pushes.
5. Codex verifies Netlify live commit.

## Usage Reporting Standard

All agent results should include:

- `Estimated tokens used`
- `Estimated tokens remaining`
- `Constraint risk`

Codex note:
- exact internal token counters are not exposed in this interface
- Codex reports practical usage level per response (`low`/`medium`/`high`)
