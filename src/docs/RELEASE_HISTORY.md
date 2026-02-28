# Release History

Last updated: 2026-02-28

This document stages all delivered features so far from `v1.0` through `v3.9`.
Timeline window (staged): October 2025 to February 2026.

## v3.9 (Current)

**UI Kit + Admin + Unified Preview APIs**
- Added reusable UI primitives and shell components (`Button`, `Badge`, `Panel`, `Tabs`, `DataTable`, form controls) for consistent module UX.
- Added `/admin` dashboard for chart record operations and participant/staff CRUD support.
- Unified preview API behavior across 5 chart families (Meal, MAR, Sleep, BGL, Bowel) and removed `/mealtime-chartgen` alias.
- Synced nextphase ledger, protocol docs, and runtime README truth to match shipped behavior.

## v3.8

**Build Reliability + Protocol Hardening**
- Fixed Netlify compatibility with consolidated ESLint `.mjs` config.
- Ensured Prisma client generation runs before Netlify production build.
- Added collision safety gate (`npm run schema:check:collision`) and strict PASS semantics for schema merge decisions.
- Expanded IACP orchestration docs with role matrix, guardrails, and verifier checklists.

## v3.7

**Engine Wiring + Phase E Stabilization**
- Wired stochastic chart modules through timeline realization and transactional persistence.
- Refactored grouped commit API and restoration dashboard for multi-chart tabbed preview + commit payload.
- Hardened grouped commit validation (all models validated upfront, strict source/type checks).
- Stabilized auth/session behavior for Netlify cookie handling and edge verification parity.

## v3.6

**Blue Team QA Foundations**
- Implemented Blue Team anomaly detector route (`/api/qa/detect-anomalies`) with Ghost Shift, Constipation Gap, and Unauthorised Restraint detection.
- Added QA test suite, readiness reporting, and schema/runbook documentation for anomaly workflows.
- Introduced modular restoration scaffolding and chart module contracts for synthetic QA expansion.

## v3.5

**Phase E: Grouped Commit & Restoration Refactor**
- Implemented grouped commit payload supporting 8 log types (MAR, Meal, Sleep, BGL, Bowel, Hygiene, Community, Repositioning) in single transaction.
- Refactored `/restoration` dashboard with tabbed UI (Medication | Nutrition & Bowel | Night Routine | Health & Vitals).
- Added defect highlighting: rows with `qaAnomalyFlag=true` or `qaMeta.defect` displayed with amber background for easy auditing.
- Tightened validation: source/type normalization now rejects invalid values (422) instead of silent coercion.
- Fixed grouped model validation to check all 8 models upfront with clear error messages.

**Post-Release Hardening**
- Added Prisma `rhel-openssl-3.0.x` binary target for Netlify Edge runtime compatibility (fixes 502 engine mismatch).
- Hardened auth session loop: cookie-header fallback logic ensures gwc_session resolution even with header quirks.
- Created UAT seed scripts (`seed-uat-staff.mjs`, `seed-uat-participant.mjs`) for production testing without STAFF_REQUIRED errors.

**Database Enhancements**
- Migrated gap-report storage from `/tmp` disk artifacts to PostgreSQL database.
- Added `GapReport` Prisma model with JSONB columns for KPI metrics and recommendations.
- Implemented database-first read strategy with optional `/tmp` fallback for gap-report retrieval.
- Added `GET /api/audit/gap-report?limit=N` endpoint for paginated report listing.
- Enhanced report persistence with optional `expiresAt` field for retention policies.

## v3.4

- Implemented KPI Engine with Gemini Flash AI gap-report analysis.
- Added primary navigation overhaul: `/audit-engine` (KPI trends) and `/audit-explorer` (data browser).
- Integrated protected `/api/audit/gap-report` with date-range KPI computation and AI summaries.
- Enhanced generator APIs with optional `seed` and `profile` (balanced|strict) for deterministic stochastic modifiers.
- Added session TTL configurability via `SESSION_TTL_SEC` environment variable.
- Hardened auth with cookie parity: read `gwc_session`, fallback to legacy `session`.

## v3.2

- Added homepage `What's New` feature cards.
- Reduced first-paint auth/nav flicker by gating restricted UI labels until role resolution.
- Fixed auth hydration cookie-parity for `gwc_session` with legacy `session` fallback.
- Added mobile-only dropdown navigation toggle so tabs are collapsed by default on narrow screens.
- Compacted mobile header/title/support-line spacing to reduce above-the-fold obstruction.
- Published complete version timeline route: `/whats-new`.

## v3.1

- Formalized production deployment truth verification workflow.
- Added explicit post-deploy stability monitoring guidance (pooled/direct latency checks).
- Documented next-step hydration hardening in mobile UAT plan.

## v3.0

- Delivered Mobile UAT Set A improvements:
  - KPIgen route content (no longer blank).
  - mobile typography + touch-target improvements.
  - narrow-screen toolbar and command wrapping fixes.
- Added brainstormz multi-agent protocol and mobile execution plan docs.

## v2.5

- Shifted lint command to deterministic ESLint invocation for Next 16.
- Captured unresolved lint debt and split-lane follow-up requirement.
- Kept build workflow green while exposing strict lint gaps transparently.

## v2.4

- Added formal auth transition test coverage (login/full/guest/logout behaviors).
- Documented testing approach and expected outcomes.

## v2.3

- Introduced identity-aware login phase 1 (`username + password` optional path).
- Preserved backward compatibility with legacy full-password login.
- Extended auth/session foundation for future per-user identity.

## v2.2

- Established agent communication channels (`claude.md`, `gemini.md`) and handshake protocols.
- Added orchestration model, digest loops, and verification gates documentation.
- Fixed auth role reactivity behavior in navigation flows.

## v2.1

- Added protected online operations APIs:
  - `GET /api/ops/db-health`
  - `POST /api/ops/uat`
- Hardened session handling for Edge runtime with token expiry awareness.
- Added online stress/cleanup execution path with artifact persistence.

## v2.0

- Enterprise rebrand to Chartgen by gUBII positioning.
- Added audit-readiness and deployment-notes pages.
- Added UAT control center baseline experience and governance-oriented UI framing.

## v1.4

- Clarified Neon pooled/direct deployment workflow.
- Improved deploy truth documentation process and links tracking.
- Hardened migration/deploy runbook procedures.

## v1.3

- Added on-demand PDF export for meal and MAR preview charts.
- Added personalization and founder profile presentation upgrades.
- Added Netlify deployment and production migration configuration.

## v1.2

- Added audit recovery enum values + migration updates.
- Refined audit generator behavior and verification scripts.
- Improved traceability/provenance integrity guidance and docs.

## v1.1

- Added approval governance controls and reviewer role checks.
- Expanded MAR status handling for operational realism.
- Improved preview validation and review-path rules.

## v1.0

- Introduced Prisma data model for meal and medication tracking.
- Delivered initial restoration API + dashboard foundations.
- Established candidate generation/edit/commit architecture baseline.
