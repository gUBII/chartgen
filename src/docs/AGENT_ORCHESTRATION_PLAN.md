# Agent Orchestration Plan

Last updated: 2026-02-27
Owner: Codex (orchestrator)

## 1) Objective

Define a durable multi-agent operating model for this repository so execution is:

- fast (parallel where safe),
- reliable (evidence-gated),
- auditable (clear ownership and traceable decisions).

This document is the source of truth for role routing, handoff format, acceptance gates, and escalation.

## 2) Active Agents and Responsibilities

### Codex (primary owner and release authority)

Responsibilities:

- own scope breakdown and task sequencing
- assign work to Claude/Gemini by complexity and risk
- implement directly when agents are blocked or quality is insufficient
- verify all outputs before merge/deploy
- maintain repository hygiene (staging, commits, docs, runbooks)
- enforce acceptance gates

Decision rights:

- final go/no-go on changes
- final conflict resolution between agent outputs
- final documentation truth

### Claude (complex implementation lane)

Responsibilities:

- multi-file implementation with architectural awareness
- medium/high-risk refactors
- auth/db workflow changes
- heavier debugging with causal analysis
- test additions/adjustments for changed behavior

Expected output quality:

- concrete file list
- validation evidence
- explicit blocker and next action when blocked

### Gemini (independent validation lane)

Responsibilities:

- independent endpoint and environment validation
- contradiction detection versus implementation claims
- concise risk signaling based on direct evidence
- lightweight diagnostic runs and sanity checks

Expected output quality:

- facts first
- command-output mapping
- clear risk statement

## 3) Task Routing Matrix

### Route to Claude

- auth/session flow changes
- component state architecture changes across files
- DB integration refactors
- deploy/build failure root-cause requiring multi-hop context

### Route to Gemini

- production env parity checks
- login/db-health smoke checks
- post-change verification independent from implementer
- quick contradiction audits

### Route to Codex Directly

- urgent unblockers
- cross-agent conflict resolution
- final integration and cleanup
- docs/runbook updates

## 4) Communication Channels

### Claude channel

- protocol doc: `/Users/moofasa/chartgen/claude.md`
- runtime log: `/tmp/codex_claude_handshake.log`

### Gemini channel

- protocol doc: `/Users/moofasa/chartgen/gemini.md`
- runtime log: `/tmp/codex_gemini_handshake.log`

Rule:

- protocol content stays in `.md` files
- runtime instructions/results stay in handshake logs
- no result blocks should be written into protocol `.md` docs

## 5) Delivery Contract (Required for task completion)

Every task result must include:

1. status: `PASS` / `FAIL` / `BLOCKED`
2. files changed (or `none`)
3. validation evidence (command => key output)
4. commit hash (or `no commit`)
5. blockers and single next action

Any missing field means the task is not accepted.

## 6) Verification Gates

### Gate A: Local correctness

- compile/build success for touched areas
- no unintended file drift

### Gate B: Runtime behavior

- auth path works (`/api/auth/login`, `/api/auth/check`, logout behavior)
- protected endpoint behavior remains correct (`/api/ops/db-health`)

### Gate C: Environment integrity

- Netlify production env consistency (`DATABASE_URL`, `DIRECT_URL`, `SITE_PASSWORD`)
- DB connectivity targets match canonical Neon endpoints

### Gate D: Independent cross-check

- Gemini or Codex validates claims made by implementer

Only after A+B+C+D can a change be considered ready.

## 7) Escalation and Fallback

Escalate to Codex direct implementation when:

- an agent repeats template/placeholder responses
- command flow becomes interactive/blocking
- conflicting validation results appear
- SLA misses occur on critical tasks

Fallback sequence:

1. Codex retries with stricter instruction format.
2. If still blocked, Codex implements and verifies directly.
3. Secondary agent performs independent cross-check.

## 8) Current Plan (Stage 2+)

### Completed

- DB endpoint migration to new Neon target (`ep-rough-recipe-ai1bst00` pooled/direct)
- production login + db-health verification
- auth role reactivity fix implemented (TabNav/login/AuthProvider path)
- Gemini channel normalization (protocol-only doc, runtime log separation)

### In progress

- sustained latency monitoring for direct DB connection warnings
- next auth maturity step planning

### Next queue

1. harden authentication model beyond shared password
2. add formal test coverage for login-to-nav state transitions
3. resolve lint command mismatch for Next 16-compatible lint workflow
4. run UAT stress/cleanup with artifact capture in `/uat`

## 9) Acceptance Criteria for Next Stage Start

All must be true:

- working tree clean or intentionally staged
- active plan documented and assigned
- Claude and Gemini instructions issued with UUIDs
- latest handshake results reviewed
- runbook/docs updated with latest operational truth

## 10) Audit Snapshot (2026-02-27)

Verification indicators observed:

- Claude reported production env/auth/db validation PASS with no blockers
- Gemini reported independent production validation PASS
- Codex performed direct build validation and applied auth reactivity fix

This snapshot is informational; logs remain the primary evidence source.

## 11) Periodic Workflow Digest (Continuous Improvement)

To improve coordination quality over time without creating noise:

- Claude digest cadence: every 3 completed tasks
- Gemini digest cadence: every 5 completed tasks
- Codex digest cadence: end of each stage boundary

Digest must be short and actionable:

1. what worked repeatedly
2. what failed repeatedly
3. one process change for next cycle

Digest output is appended to handshake logs, not protocol docs.

## 12) Bot-Safe Instruction Pattern (Do Not Deviate)

Use this when assigning tasks to avoid ambiguity:

```text
INSTRUCTION [UUID]
Objective: <one sentence>
Scope: <explicit boundaries>
Run/Checks:
1) <exact command/check>
2) <exact command/check>
Constraints:
- non-interactive commands only
- no protocol doc edits unless requested
Reply format:
RESULT [UUID]
Status: PASS|FAIL|BLOCKED
<required evidence fields>
```
