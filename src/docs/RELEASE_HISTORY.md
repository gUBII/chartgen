# Release History

Last updated: 2026-02-27

This document stages all delivered features so far from `v1.0` through `v3.2`.

## v3.2 (Current)

- Added homepage `What's New` feature cards.
- Reduced first-paint auth/nav flicker by gating restricted UI labels until role resolution.
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
