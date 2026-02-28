# NEXTPHASE — Execution Ledger (Revamped)

Last updated: 2026-03-01
Owner: Codex

This file replaces the old speculative roadmap with a stateful ledger.
Completed work is explicitly deprecated from future planning.

## Status Legend

- `DEPRECATED_PROD`: already in production; remove from backlog.
- `DEPRECATED_MAIN`: merged to `main`; do not re-plan.
- `LOCAL_DONE_PENDING_REVIEW`: implemented in local worktree, not yet merged.
- `ACTIVE`: planned and assigned.
- `BLOCKED`: waiting on dependency.

## 1) Deprecation Ledger (Step-by-step)

### Step 1 — Items already shipped (deprecate now)

| Area | Status | Evidence |
|---|---|---|
| Grouped commit API for 8 chart arrays | `DEPRECATED_PROD` | `v3.5`, commits `09603604`, `6aae21d3` |
| Restoration tabbed preview + defect highlight | `DEPRECATED_PROD` | `v3.5`, commit `d23acc20` |
| DB-backed gap reports (`GapReport`) | `DEPRECATED_PROD` | `v3.5`, commit `4bc21d6b` |
| Blue Team anomaly detector route | `DEPRECATED_PROD` | commit `af40db4d` (ancestor of deployed `3bda6faa`) |
| Netlify Prisma generate build fix | `DEPRECATED_PROD` | commit `827a787b` (ancestor of deployed `3bda6faa`) |
| ESLint cloud compatibility fix (`.mjs`) | `DEPRECATED_PROD` | commit `dfd89091` (ancestor of deployed `3bda6faa`) |
| Schema collision safety gate | `DEPRECATED_PROD` | commit `2fdf1118` (ancestor of deployed `3bda6faa`) |

### Step 2 — Items shipped and closed from previous lanes

| Area | Status | Evidence |
|---|---|---|
| App Shell (`SiteHeader`, `PrimaryNav`, `SiteFooter`, `AppLayout`) | `DEPRECATED_PROD` | commits `67a85a4c`, `f14552a5`, `409c2248` (included in deployed `3bda6faa`) |
| UI Kit primitives (`Button`, `Badge`, `Panel`, `Tabs`, `DataTable`, forms) | `DEPRECATED_PROD` | commit `67a85a4c` (included in deployed `3bda6faa`) |
| IACP v2 protocol docs and role matrix (baseline) | `DEPRECATED_MAIN` | `src/docs/iacp/*`, `claude.md`, `gemini.md` (local policy refresh in progress) |

### Step 3 — Items still open (active backlog)

| ID | Work | Status | Owner |
|---|---|---|---|
| RS-04 | Restoration client/worker dropdown + weekday worker assignment | `LOCAL_DONE_PENDING_REVIEW` | Codex+Claude |
| MC-01 | `/chartgen-core` route + catalog components | `LOCAL_DONE_PENDING_REVIEW` | Codex |
| PF-01 | `/entry` preflight wizard | `LOCAL_DONE_PENDING_REVIEW` | Claude |
| EX-01/02 | Audit explorer table/filter drill-down upgrade (replace mock table with real source) | `LOCAL_DONE_PENDING_REVIEW` | Codex |
| AE-01/02/03 | Audit engine UI composition upgrades (replace alert flow + richer KPI composition) | `LOCAL_DONE_PENDING_REVIEW` | Claude |
| PL-01 | Remove remaining `window.alert` UX from live pages | `LOCAL_DONE_PENDING_REVIEW` | Codex |
| PL-03 | Full E2E/UAT flow consolidation (single batched release gate) | `LOCAL_DONE_PENDING_REVIEW` | Codex+Claude |

## 2) Ticket Mapping (Old Plan -> Current Truth)

| Legacy Ticket | New State |
|---|---|
| UI-01/UI-02/UI-03/UI-04 | `DEPRECATED_PROD` |
| SH-01/SH-02/SH-03/SH-04 | `DEPRECATED_PROD` |
| RS-03 (tabbed restoration) | `DEPRECATED_PROD` |
| LP-01/02/03 (landing decomposition) | `DEPRECATED_PROD` (commit `f14552a5`) |
| PL-01 (`window.alert` replacement) | `LOCAL_DONE_PENDING_REVIEW` |
| PL-03 (full E2E flow) | `LOCAL_DONE_PENDING_REVIEW` |

## 3) Active Dispatch Snapshot (Current)

### Claude Dispatches

- BATCH4 complete: `PF-01`, `AE-01`, `AE-02`, `AE-03` — `LOCAL_DONE_PENDING_REVIEW` (commit `49d0cb06`).
- RS-04 hardening: weekday map inline validation added — `LOCAL_DONE_PENDING_REVIEW` (commit `49d0cb06`).
- FASTLANE-C: PL-03 smoke matrix doc created — `LOCAL_DONE_PENDING_REVIEW` (commit `ca1272b3`).
- TASK-D: nextphase truth-sync + PL03 gate commands — in progress.

### Claude Quality Verifier Role (effective 2026-03-01)

- Claude verifies own task outputs before RESULT emission (lint+build+behavior).
- Claude reviews Gemini results for correctness before acceptance.
- badkpicodex protocol: +2 per meaningless poll, resets on real dispatch.

### RS-04 UAT Evidence (2026-03-01)

- Client dropdown: populated from `/api/admin/participants`, uses `fullName` field, auto-selects first participant.
- Worker dropdown (Default + Reviewer): populated from `/api/admin/staff`, auto-selects SUPERVISOR for reviewer and SUPPORT_WORKER for default worker.
- Weekday assignment: 7-day grid in `<details>` collapsible; each day falls back to default worker if empty.
- Payload validation: `onGenerate` checks all non-empty `workerScheduleByDow` entries against known `staffOptions` IDs; inline error shown (no alert) if any DOW references an invalid staffId.
- Payload shape: `workerScheduleByDow` filtered to non-empty values before POST to `/api/engine/preview` — unchanged from Codex RS-04 implementation.

### Gemini Dispatches

- `NP-SUMMARY-20260301-A` — no-edit stale/done/left verification for this ledger (PASS).

## 4) Promotion Rules (No Guesswork)

Move any `LOCAL_DONE_PENDING_REVIEW` item to `DEPRECATED_MAIN` only after:

1. `npm run build` passes.
2. `npm run lint:report` has no new errors.
3. Independent verification PASS from Gemini.
4. Codex code review PASS.
5. Commit is merged to `main`.

Move any `DEPRECATED_MAIN` item to `DEPRECATED_PROD` only after:

1. Netlify deploy for the commit succeeds.
2. UAT smoke checks pass on live route.

## 5) Immediate Next Actions (Frugal)

1. Promote all `LOCAL_DONE_PENDING_REVIEW` items to `DEPRECATED_MAIN` after Gemini verification + Codex review.
2. Perform one batched deployment only after `DEPLOY_APPROVED`.
3. PL-03 gate: run `src/docs/PL03_SMOKE_MATRIX.md` gate commands before any deploy.
