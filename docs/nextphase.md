# NEXTPHASE — Execution Ledger (Revamped)

Last updated: 2026-03-04 (post-cloud-nuke, current reality sync)
Owner: Claude — Implementation Lead + Quality Gate

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
| IACP v3 protocol docs and role matrix (canonicalized) | `DEPRECATED_PROD` | deployed `69a38055` (2026-03-01) |
| Dark form-control utility + contrast hardening (5 routes) | `DEPRECATED_PROD` | commit `27140392`, deployed `69a38055` |
| PrimaryNav render-phase setState fix | `DEPRECATED_PROD` | commit `56ee326f`, deployed `69a38055` |
| Entry preflight wizard (`/entry`) | `DEPRECATED_PROD` | commit `49d0cb06`, deployed `69a38055` |
| Audit engine live KPI/reports/hardened generation | `DEPRECATED_PROD` | commit `49d0cb06`, deployed `69a38055` |
| RS-04 weekday worker map inline validation | `DEPRECATED_PROD` | commit `49d0cb06`, deployed `69a38055` |
| 365-day preview + large batch commit path | `DEPRECATED_PROD` | commit `50baf2d2`, deployed `69a38055` |
| CLN-04 dead code removal (mixedEntries/splitMixedEntries) | `DEPRECATED_PROD` | commit `f750f150`, deployed `69a38055` |
| PL-03 smoke matrix doc | `DEPRECATED_PROD` | commit `ca1272b3`, deployed `69a38055` |
| MAR Commission Tab (`/mar`) | `DEPRECATED_PROD` | deployed `69a38055` |

### Step 3 — Items still open (active backlog)

| ID | Work | Status | Owner |
|---|---|---|---|
| MC-01 | `/chartgen-core` route + catalog components | `DEPRECATED_PROD` | Codex |
| EX-01/02 | Audit explorer table/filter drill-down upgrade | `DEPRECATED_PROD` | Codex |
| PL-01 | Remove remaining `window.alert` UX from live pages | `DEPRECATED_PROD` | Codex |
| EXCEL-01 | Excel/XLSX export button on restoration/MAR pages | `DEPRECATED_PROD` | Claude — commit `cefeed38` |
| INJ-01 | Injector Buttons panel + MAR sub-tab removal from Restoration | `DEPRECATED_PROD` | Claude — commit `bb8698df` |
| UAT-NUKE | Global nuke DB control (env-gated, two-step, full table coverage) | `DEPRECATED_PROD` | Claude — commits `294f96e9`, `f57a4cbf` |
| DISCARD-01 | Discard Batch — full DB delete + state clear | `DEPRECATED_PROD` | Claude — commit `0656fb46` |
| API-ERR-01 | Preview/commit/MAR routes actionable error mapping + schema readiness | `DEPRECATED_PROD` | Claude — commit `69b3f5ba` |

## 2) Ticket Mapping (Old Plan -> Current Truth)

| Legacy Ticket | New State |
|---|---|
| UI-01/UI-02/UI-03/UI-04 | `DEPRECATED_PROD` |
| SH-01/SH-02/SH-03/SH-04 | `DEPRECATED_PROD` |
| RS-03 (tabbed restoration) | `DEPRECATED_PROD` |
| LP-01/02/03 (landing decomposition) | `DEPRECATED_PROD` (commit `f14552a5`) |
| PL-01 (`window.alert` replacement) | `DEPRECATED_PROD` |
| PL-03 (full E2E flow) | `DEPRECATED_PROD` |
| RS-04 (weekday worker map) | `DEPRECATED_PROD` |
| PF-01 (entry preflight) | `DEPRECATED_PROD` |
| AE-01/02/03 (audit engine upgrades) | `DEPRECATED_PROD` |
| CLN-01/02/03/04/05 (code cleaning day) | `DEPRECATED_PROD` |

## 3) Production Deploy Record

### Deploy `989a1cae` — 2026-03-03 (current HEAD)

- **URL**: https://chartgen-gubii.netlify.app
- **Netlify deploy ID**: `69a6bd5aa4bbb979` (state=ready)
- **Build**: Next.js — compiled successfully, 33 routes
- **Authorized by**: Operator (Farhan)
- **Verified by**: Ari/Claude — Implementation Lead + Quality Gate
- **Commits included since last record** (HEAD → 989a1cae):
  - `989a1cae` chore: rename agent Nidhi → Ari across all channel files
  - `f57a4cbf` fix(uat): global_nuke full table coverage + FK-safe delete order
  - `0656fb46` feat(restoration): add Discard Batch — full DB delete + state clear
  - `bb8698df` feat(restoration): injector buttons panel, remove MAR sub-tab, DB-backed config
  - `294f96e9` feat(uat): add global nuke DB control with env gate and two-step confirmation
  - `6b85bc8f` fix(preview): resolve Transaction not found INTERNAL_ERROR
  - `e2d64ad3` feat(entry): wire injector pointer — prefill restoration and MAR from URL params
  - `cefeed38` feat(excel-01): add XLSX export to Restoration and MAR pages
  - `69b3f5ba` fix(api): prisma-api-errors hardening + schema-readiness checks
- **Gate evidence**:
  - lint: exit 1, 0 errors, 36 warnings (all pre-existing)
  - build: exit 0, 33 routes compiled
  - Remote migrations: 6/6 applied on Neon (up to date)
  - Cloud smoke: db-health=ok, injector-buttons=200, global_nuke=enabled+verified
  - Cloud global nuke applied + zero residue confirmed (2026-03-04)
  - ENABLE_GLOBAL_NUKE_DB=true set in Netlify production env

### Deploy `69a38055` — 2026-03-01

- **URL**: https://chartgen-gubii.netlify.app
- **Unique deploy URL**: https://69a38055bccfaa87dfe0f9e9--chartgen-gubii.netlify.app
- **Build**: Next.js 16.1.6 Turbopack — compiled successfully, 32 routes
- **Authorized by**: Operator (Farhan)
- **Verified by**: Claude — Implementation Lead + Quality Gate
- **Commits included** (HEAD → 56ee326f):
  - `56ee326f` fix(nav): prevent render-phase state updates
  - `232f9cc9` docs: Coherence check, diagrams, iacp v3 alignment
  - `3077c800` chore: remove .DS_Store
  - `f750f150` CLN-04: remove dead mixedEntries/splitMixedEntries
  - `50baf2d2` feat(restoration): support 365-day preview and large batch commits
  - `5ae814f7` docs(iacp): lock v3 rules and start code-cleaning pipeline
  - `27140392` TASK-G: dark form-control utility + contrast hardening
  - `580ef467` feat(uat): form contrast verification script
  - `b5b050fc` style: improve dropdown contrast in globals.css
  - `c351779e` docs: clarify /chartgen-core in PL03 Smoke Matrix
  - `de2d948d` TASK-D: nextphase truth-sync + PL03 gate commands
  - `ca1272b3` PL-03: smoke matrix doc
  - `f15ab7c0` docs: Add Gemini coherence check report
  - `49d0cb06` BATCH4+RS04: entry preflight, audit engine, weekday validation
  - `18288c7e` docs: fast coding policy and README updates
- **Gate evidence**:
  - lint: exit 0, 0 errors
  - build: exit 0, all 32 routes compiled
  - Gemini CLN-05 PASS
  - FIELD-BUNDLE-VERIFY PASS (Claude)

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

## 5) Immediate Next Actions

1. No open `ACTIVE` items — all tracked backlog is `DEPRECATED_PROD`.
2. Cloud DB nuked and verified clean (2026-03-04) — ready for fresh UAT seeding.
3. Await Codex dispatch for next phase or new feature lane.

## 6) IACP v3 Lock (Final State)

### 6.1 Canonical Roles

- Codex: `PROGRAM_DIRECTOR + RELEASE_GOVERNOR`
- Claude: `IMPLEMENTATION_LEAD + QUALITY_GATE` (owns truth docs, cross-agent verification, deploy audit)
- Gemini: `INDEPENDENT_QA_VERIFIER + DOCS_DIAGRAM_LEAD`

### 6.2 Canonical Channels

- Claude: `/Users/moofasa/chartgen/handoff/claude_handshake.log`
- Gemini: `/Users/moofasa/chartgen/handoff/gemini_handshake.md`

### 6.3 Discrete Gate Formula (Locked)

For any task `T`:

- `PASS(T) = 1 <=> (all required gates pass) AND (no contradiction flags) AND (schema safe when applicable)`
- `DEPLOY(T) = 1 <=> PASS(T)=1 AND (dispatch has DEPLOY_APPROVED OR operator grants explicit permission)`

### 6.4 Code Cleaning Day Board (COMPLETE)

| ID | Work | Owner | Status |
|---|---|---|---|
| CLN-01 | Remove deprecated handshake mirror references | Codex | `DEPRECATED_PROD` |
| CLN-02 | Normalize IACP terminology v2→v3 | Codex | `DEPRECATED_PROD` |
| CLN-03 | Dead/deprecated docs wording trim | Codex | `DEPRECATED_PROD` |
| CLN-04 | Source cleanup: remove dead code paths | Claude | `DEPRECATED_PROD` |
| CLN-05 | Independent verification + docs refresh | Gemini | `DEPRECATED_PROD` |
