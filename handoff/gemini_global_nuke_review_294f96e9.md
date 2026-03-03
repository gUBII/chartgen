# Global Nuke Review (Fallback by Codex)

Commit reviewed: `294f96e9`
Reviewer lane: fallback (Gemini throttled)
Date: 2026-03-03

## Summary
The feature is partially implemented and safety-gated, but it does **not** currently satisfy strict "entire DB" deletion semantics.

## Findings
1. **Scope mismatch vs "entire DB"**
- `global_nuke` deletes a subset of tables only.
- Missing from delete/count set include at least:
  - `BehaviourSupportPlan`
  - `RestrictivePracticeEvent`
  - `SleepSettlingQaLog`
  - `BowelFluidQaLog`
  - `InjectorButton`
  - `Participant`
  - `Staff`
- File: `src/app/api/ops/uat/route.ts` (`executeGlobalNuke`).

2. **Safety controls are present and correct**
- Env gate required: `ENABLE_GLOBAL_NUKE_DB=true`.
- Two-step flow present: dry-run returns required confirmation text; apply requires exact match.
- Full-session auth gate preserved at endpoint entry.

3. **Participant cleanup path remains intact**
- Existing participant-scoped cleanup flow is still present and unchanged in behavior path.

## Safety Gate Verification
- Session gate: PASS
- Env gate: PASS
- Confirmation gate: PASS
- Dry-run/apply counts contract: PASS (for included tables)

## Regression Check
- Participant cleanup flow: PASS (no detected regression in route branching)

## Recommendation
**CHANGES_REQUIRED**

Rationale: until global_nuke includes all intended DB tables (or is relabeled as scoped operational purge), the feature is misleading relative to "Nuke Entire DB" behavior.
