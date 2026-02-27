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

### Brainstormz channel

- protocol doc: `/Users/moofasa/chartgen/brainstormz.md`
- shared decision log: `/tmp/brainstormz_chat.log`

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
- mobile UAT Set A implementation:
  - `/kpigen` placeholder removed
  - guest/full nav clarity updated
  - root scaling and touch targets improved
  - command wrapping + narrow-toolbar layout improvements
  - mobile dropdown navigation and compact header spacing shipped to production
  - Claude queue hard-reset completed; standby ACK received

### In progress

- sustained latency monitoring for direct DB connection warnings
- lint debt split strategy decision (`lint:report` vs `lint:strict`) if strict pass cannot be achieved quickly

### Next queue

1. live browser UAT capture across 375/768/1280 breakpoints
2. harden authentication model beyond shared password
3. close lint debt lane with explicit policy and docs
4. run UAT stress/cleanup with artifact capture in `/uat`
5. wire KPIgen cards to live signals/API output

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

## 13) Resource-Aware CTO Model (New)

Goal: maximize delivery per token while keeping reliability high.

### Allocation by capability and budget

- Claude:
  - use for implementation-heavy or architecture-sensitive tasks
  - avoid for wide diagnostics and repetitive checks
  - concurrency cap: 1 implementation UUID active at a time
- Gemini:
  - use for assertion-based verification and contradiction checks
  - avoid for broad exploratory repo reads
  - concurrency cap: up to 2 verification UUIDs in parallel when high budget
- Codex:
  - own integration, decisioning, staging/commit, and final truth docs

### Response minimization policy

- PASS + no edits:
  - one-line schema only
- FAIL/BLOCKED:
  - full schema with evidence and one unblock action
- Placeholder outputs (`<...>` or literal option lists) are invalid and auto-rejected

### Efficiency constraints

- scope-lock every UUID to explicit files/endpoints
- no re-reading protocol docs per task
- batch independent commands
- use assertion language for verification tasks

## 14) Immediate Next Stage (v3.3)

1. Auth/session hardening baseline:
   - verify cookie parity and hydration correctness
   - tighten non-breaking login/session reliability
2. Live mobile UAT matrix:
   - verify 375/390/430/768 viewports
   - capture residual issues with evidence
3. Ops reliability guardrails:
   - continue pooled/direct latency trend checks
   - define alert thresholds and reporting cadence

## 15) Result Compliance Guard

Purpose: automatically reject malformed agent `RESULT` payloads before they are accepted into workflow truth.

Guard command:

```bash
npm run agent:check:result -- /tmp/codex_claude_handshake.log <UUID>
npm run agent:check:result -- /tmp/codex_gemini_handshake.log <UUID>
```

Interpretation:

- exit `0`: compliant concrete result
- exit `1`: non-compliant placeholder/template output
- exit `2`: missing result block

Policy:

- non-compliant results are rejected and reissued with strict one-line schema
- missing results are treated as pending, not pass
