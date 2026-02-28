# NEXTPHASE — Execution Ledger (Revamped)

Last updated: 2026-02-28
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
| Blue Team anomaly detector route | `DEPRECATED_MAIN` | commit `af40db4d` |
| Netlify Prisma generate build fix | `DEPRECATED_MAIN` | commit `827a787b` |
| ESLint cloud compatibility fix (`.mjs`) | `DEPRECATED_MAIN` | commit `dfd89091` |
| Schema collision safety gate | `DEPRECATED_MAIN` | commit `2fdf1118` |

### Step 2 — Items implemented locally (keep, but not re-spec)

| Area | Status | Evidence |
|---|---|---|
| App Shell (`SiteHeader`, `PrimaryNav`, `SiteFooter`, `AppLayout`) | `LOCAL_DONE_PENDING_REVIEW` | `src/components/shell/*`, `src/app/layout.tsx` |
| UI Kit primitives (`Button`, `Badge`, `Panel`, `Tabs`, `DataTable`, forms) | `LOCAL_DONE_PENDING_REVIEW` | `src/components/ui/*` |
| IACP v2 protocol docs and role matrix | `LOCAL_DONE_PENDING_REVIEW` | `src/docs/iacp/*`, `claude.md`, `gemini.md` |

### Step 3 — Items still open (active backlog)

| ID | Work | Status | Owner |
|---|---|---|---|
| AD-01 | Create `/admin` dashboard route + list UI | `LOCAL_DONE` | Claude |
| AD-02 | Admin create/edit forms + save path per chart family | `LOCAL_DONE` | Claude |
| UP-01 | Unified preview API (5 families: Meal + MAR + Sleep + BGL + Bowel) | `LOCAL_DONE` | Claude |
| UP-02 | Restoration page wiring for all 5 families | `LOCAL_DONE` | Claude |
| CL-01 | Remove `/mealtime-chartgen` alias + update all references | `LOCAL_DONE` | Claude |
| AC-01 | Admin participant/staff CRUD (API + UI) | `LOCAL_DONE` | Claude |
| LP-01/02/03 | Landing decomposition from 414-line page | `ACTIVE` | Codex + Claude |
| RS-01/02 | Restoration decomposition into hooks/components | `ACTIVE` | Codex |
| MC-01 | `/chartgen-core` route + catalog components | `ACTIVE` | Claude |
| PF-01 | `/entry` preflight wizard | `ACTIVE` | Claude |
| CM-01 | Hygiene/Community/Repositioning chart modules (partially addressed — Sleep/BGL/Bowel now wired) | `ACTIVE` | Codex |
| CM-02 | Extract `MealChartModule` from engine | `ACTIVE` | Codex |
| EX-01/02 | Audit explorer table/filter drill-down upgrade | `ACTIVE` | Claude |
| AE-01/02/03 | Audit engine UI composition upgrades | `ACTIVE` | Claude |

## 2) Ticket Mapping (Old Plan -> Current Truth)

| Legacy Ticket | New State |
|---|---|
| UI-01/UI-02/UI-03/UI-04 | `LOCAL_DONE_PENDING_REVIEW` |
| SH-01/SH-02/SH-03/SH-04 | `LOCAL_DONE_PENDING_REVIEW` |
| RS-03 (tabbed restoration) | `DEPRECATED_PROD` |
| PL-01 (`window.alert` replacement) | `DEPRECATED_MAIN` (no `window.alert` currently found) |
| PL-03 (full E2E flow) | `ACTIVE` |

## 3) Active Dispatch Snapshot

### Claude Dispatches

- `085DE9E0-0F27-45F4-A6CE-B0CE10A83367` — Wave-1 stabilization, UAT, synthetic seeds, admin MVP.
- `D8F2A719-RESYNC` — schedule truth + JS diagnostics + `brainstormz.md` findings.

### Gemini Dispatches

- `1A6FFBFD-1140-49E5-948E-5DE4B3D852BE` — README Mermaid architecture/data-flow/auth/QA diagrams.
- `VER-LANE-RESYNC` — independent verification checklist and diagram drift report.

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

1. Wait for Claude/Gemini result payloads for the two active UUID lanes.
2. Integrate approved code/docs.
3. Run build + lint delta.
4. Stage atomic commits (shell/ui, docs, admin, diagnostics).
5. Deploy and verify live UAT.

